"use server";

import { Buffer } from "node:buffer";
import { gunzipSync } from "node:zlib";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDashboardContext } from "@/lib/dashboard";
import { parseVcfContent } from "@/lib/sample-processing";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types";

function buildSamplesRedirect(type: "error" | "success", message: string) {
  return `/samples?${type}=${encodeURIComponent(message)}`;
}

function maybeGunzip(fileName: string, buffer: Buffer) {
  if (fileName.toLowerCase().endsWith(".gz")) {
    return gunzipSync(buffer);
  }

  return buffer;
}

export async function processSampleAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildSamplesRedirect("error", "Your organization context is not ready yet."));
  }

  const sampleId = String(formData.get("sampleId") ?? "").trim();

  if (!sampleId) {
    redirect(buildSamplesRedirect("error", "Choose a sample before starting processing."));
  }

  const supabase = await createSupabaseServerClient();
  const { data: sample, error: sampleError } = await supabase
    .from("genomic_samples")
    .select("id, patient_id, file_name, file_path, status")
    .eq("id", sampleId)
    .maybeSingle();

  if (sampleError) {
    redirect(buildSamplesRedirect("error", sampleError.message));
  }

  if (!sample) {
    redirect(buildSamplesRedirect("error", "The selected sample is not accessible."));
  }

  if (sample.status === "processing") {
    redirect(buildSamplesRedirect("error", "This sample is already being processed."));
  }

  const { count: existingVariantCount, error: existingVariantError } = await supabase
    .from("variants")
    .select("*", { count: "exact", head: true })
    .eq("sample_id", sampleId);

  if (existingVariantError) {
    redirect(buildSamplesRedirect("error", existingVariantError.message));
  }

  if ((existingVariantCount ?? 0) > 0) {
    redirect(
      buildSamplesRedirect(
        "error",
        "This sample already has stored variants. Use a fresh sample for automated processing.",
      ),
    );
  }

  await supabase
    .from("genomic_samples")
    .update({
      parser_version: "genomeiq-vcf-parser/1.0",
      processing_completed_at: null,
      processing_started_at: new Date().toISOString(),
      status: "processing",
    })
    .eq("id", sampleId);

  let successMessage = "";

  try {
    const { data: fileData, error: downloadError } = await supabase.storage
      .from("genomic-samples")
      .download(sample.file_path);

    if (downloadError || !fileData) {
      throw new Error(downloadError?.message ?? "The uploaded sample file could not be downloaded.");
    }

    const arrayBuffer = await fileData.arrayBuffer();
    const sourceBuffer = Buffer.from(arrayBuffer);
    const contentBuffer = maybeGunzip(sample.file_name, sourceBuffer);
    const parsed = parseVcfContent(contentBuffer.toString("utf-8"));

    if (parsed.variants.length === 0) {
      throw new Error("No variant rows could be parsed from this VCF.");
    }

    const uniqueGenes = Array.from(
      new Set(parsed.variants.map((variant) => variant.gene).filter((gene) => gene !== "UNKNOWN")),
    );

    if (uniqueGenes.length > 0) {
      const { error: geneUpsertError } = await supabase.from("genes").upsert(
        uniqueGenes.map((symbol) => ({
          metadata: { imported_from_vcf: true } as Json,
          name: symbol,
          summary: "Imported from VCF processing.",
          symbol,
        })),
        { onConflict: "symbol" },
      );

      if (geneUpsertError) {
        throw new Error(geneUpsertError.message);
      }
    }

    const { data: genesData, error: genesError } = uniqueGenes.length
      ? await supabase.from("genes").select("id, symbol").in("symbol", uniqueGenes)
      : { data: [], error: null };

    if (genesError) {
      throw new Error(genesError.message);
    }

    const genesBySymbol = new Map((genesData ?? []).map((gene) => [gene.symbol, gene.id]));
    const nowIso = new Date().toISOString();
    const { data: insertedVariants, error: variantsInsertError } = await supabase
      .from("variants")
      .insert(
        parsed.variants.map((variant, index) => {
          const baseSourceData =
            variant.sourceData && typeof variant.sourceData === "object" && !Array.isArray(variant.sourceData)
              ? variant.sourceData
              : {};

          return {
            acmg_criteria: variant.acmgCriteria,
            alt_allele: variant.altAllele,
            chromosome: variant.chromosome,
            classification: variant.classification,
            consequence: variant.consequence,
            gene: variant.gene,
            gene_id: genesBySymbol.get(variant.gene) ?? null,
            hgvs_c: variant.hgvsC,
            hgvs_p: variant.hgvsP,
            position: variant.position,
            ref_allele: variant.refAllele,
            sample_id: sampleId,
            source_data: {
              ...baseSourceData,
              import_index: index,
              imported_at: nowIso,
            } as Json,
            transcript: variant.transcript,
            zygosity: variant.zygosity,
          };
        }),
      )
      .select("id, gene_id, gene, source_data");

    if (variantsInsertError) {
      throw new Error(variantsInsertError.message);
    }

    const variantIdByImportIndex = new Map<number, { gene: string; geneId: string | null; id: string }>();

    for (const insertedVariant of insertedVariants ?? []) {
      const sourceData =
        insertedVariant.source_data && typeof insertedVariant.source_data === "object"
          ? insertedVariant.source_data
          : null;
      const importIndex =
        sourceData && !Array.isArray(sourceData) && typeof sourceData.import_index === "number"
          ? sourceData.import_index
          : null;

      if (importIndex !== null) {
        variantIdByImportIndex.set(importIndex, {
          gene: insertedVariant.gene,
          geneId: insertedVariant.gene_id,
          id: insertedVariant.id,
        });
      }
    }

    const annotationRows = parsed.variants.flatMap((variant, index) => {
      const insertedVariant = variantIdByImportIndex.get(index);

      if (!insertedVariant) {
        return [];
      }

      return variant.annotations.map((annotation) => ({
        data: annotation.data,
        source: annotation.source,
        variant_id: insertedVariant.id,
      }));
    });

    if (annotationRows.length > 0) {
      const { error: annotationsError } = await supabase.from("annotations").insert(annotationRows);

      if (annotationsError) {
        throw new Error(annotationsError.message);
      }
    }

    const insertedGeneIds = Array.from(
      new Set(
        Array.from(variantIdByImportIndex.values())
          .map((variant) => variant.geneId)
          .filter((geneId): geneId is string => Boolean(geneId)),
      ),
    );

    if (insertedGeneIds.length > 0) {
      const { data: geneDiseaseAssociations, error: geneDiseaseError } = await supabase
        .from("gene_disease_associations")
        .select("gene_id, disease_id, evidence_level, source, confidence")
        .in("gene_id", insertedGeneIds);

      if (geneDiseaseError) {
        throw new Error(geneDiseaseError.message);
      }

      const associationsByGeneId = new Map<
        string,
        {
          confidence: number | null;
          disease_id: string;
          evidence_level: string | null;
          gene_id: string;
          source: string | null;
        }[]
      >();

      for (const association of geneDiseaseAssociations ?? []) {
        const items = associationsByGeneId.get(association.gene_id) ?? [];
        items.push(association);
        associationsByGeneId.set(association.gene_id, items);
      }

      const variantDiseaseRows = Array.from(variantIdByImportIndex.values()).flatMap((variant) => {
        if (!variant.geneId) {
          return [];
        }

        return (associationsByGeneId.get(variant.geneId) ?? []).map((association) => ({
          disease_id: association.disease_id,
          evidence_level: association.evidence_level,
          metadata: {
            confidence: association.confidence,
            source: association.source,
          } as Json,
          therapeutic_relevance: "review_required",
          variant_id: variant.id,
        }));
      });

      if (variantDiseaseRows.length > 0) {
        const { error: variantDiseaseError } = await supabase
          .from("variant_disease_associations")
          .upsert(variantDiseaseRows, { onConflict: "variant_id,disease_id" });

        if (variantDiseaseError) {
          throw new Error(variantDiseaseError.message);
        }
      }
    }

    const clinicallySignificantCount = parsed.variants.filter(
      (variant) =>
        variant.classification === "pathogenic" || variant.classification === "likely_pathogenic",
    ).length;
    const qualityRows = [
      {
        details: {
          parser_version: "genomeiq-vcf-parser/1.0",
        } as Json,
        metric_type: "total_variant_lines",
        numeric_value: parsed.totalVariantLines,
        organization_id: context.organizationId,
        sample_id: sampleId,
        status: "observed",
      },
      {
        details: {
          parser_version: "genomeiq-vcf-parser/1.0",
        } as Json,
        metric_type: "parsed_variants",
        numeric_value: parsed.variants.length,
        organization_id: context.organizationId,
        sample_id: sampleId,
        status: "pass",
      },
      {
        details: {
          max_variant_limit: 250,
          parser_version: "genomeiq-vcf-parser/1.0",
        } as Json,
        metric_type: "filtered_variant_lines",
        numeric_value: parsed.filteredVariantCount,
        organization_id: context.organizationId,
        sample_id: sampleId,
        status: parsed.filteredVariantCount === 0 ? "pass" : "warning",
      },
      {
        details: {
          parser_version: "genomeiq-vcf-parser/1.0",
        } as Json,
        metric_type: "clinically_significant_variants",
        numeric_value: clinicallySignificantCount,
        organization_id: context.organizationId,
        sample_id: sampleId,
        status: clinicallySignificantCount > 0 ? "review" : "pass",
      },
    ];

    const { error: qualityError } = await supabase.from("quality_metrics").insert(qualityRows);

    if (qualityError) {
      throw new Error(qualityError.message);
    }

    const { error: sampleUpdateError } = await supabase
      .from("genomic_samples")
      .update({
        file_size_bytes: sourceBuffer.byteLength,
        parser_version: "genomeiq-vcf-parser/1.0",
        processing_completed_at: new Date().toISOString(),
        status: "completed",
      })
      .eq("id", sampleId);

    if (sampleUpdateError) {
      throw new Error(sampleUpdateError.message);
    }

    revalidatePath("/dashboard");
    revalidatePath("/samples");
    revalidatePath("/variants");
    revalidatePath("/reports");
    revalidatePath("/analytics");
    revalidatePath(`/patients/${sample.patient_id}`);
    successMessage = `Sample processed successfully. ${parsed.variants.length} variants were stored.`;
  } catch (error) {
    await supabase
      .from("genomic_samples")
      .update({
        processing_completed_at: new Date().toISOString(),
        status: "failed",
      })
      .eq("id", sampleId);

    await supabase.from("quality_metrics").insert({
      details: {
        error: error instanceof Error ? error.message : "Unknown error",
        parser_version: "genomeiq-vcf-parser/1.0",
      } as Json,
      metric_type: "processing_error",
      organization_id: context.organizationId,
      sample_id: sampleId,
      status: "failed",
    });

    redirect(
      buildSamplesRedirect(
        "error",
        error instanceof Error ? error.message : "Sample processing failed.",
      ),
    );
  }

  redirect(buildSamplesRedirect("success", successMessage));
}
