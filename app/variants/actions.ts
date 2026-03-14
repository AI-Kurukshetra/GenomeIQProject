"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDashboardContext } from "@/lib/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnnotationSource, Json, VariantClassification } from "@/types";

function buildRedirectUrl(kind: "error" | "success", message: string) {
  return `/variants?${kind}=${encodeURIComponent(message)}`;
}

function parseAcmgCriteria(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean);
}

export async function createVariantAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildRedirectUrl("error", "Your organization context is not ready yet."));
  }

  const sampleId = String(formData.get("sampleId") ?? "").trim();
  const gene = String(formData.get("gene") ?? "").trim().toUpperCase();
  const chromosome = String(formData.get("chromosome") ?? "").trim().toUpperCase();
  const position = Number.parseInt(String(formData.get("position") ?? "").trim(), 10);
  const refAllele = String(formData.get("refAllele") ?? "").trim().toUpperCase();
  const altAllele = String(formData.get("altAllele") ?? "").trim().toUpperCase();
  const zygosity = String(formData.get("zygosity") ?? "").trim();
  const classification = String(
    formData.get("classification") ?? "",
  ).trim() as VariantClassification;
  const annotationSources = formData
    .getAll("annotationSources")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const annotationNote = String(formData.get("annotationNote") ?? "").trim();
  const acmgCriteria = parseAcmgCriteria(String(formData.get("acmgCriteria") ?? ""));

  if (
    !sampleId ||
    !gene ||
    !chromosome ||
    !Number.isInteger(position) ||
    position <= 0 ||
    !refAllele ||
    !altAllele ||
    !zygosity ||
    !classification
  ) {
    redirect(
      buildRedirectUrl(
        "error",
        "Sample, gene, locus, alleles, zygosity, and classification are required.",
      ),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: sample, error: sampleError } = await supabase
    .from("genomic_samples")
    .select("id, patient_id, status")
    .eq("id", sampleId)
    .maybeSingle();

  if (sampleError) {
    redirect(buildRedirectUrl("error", sampleError.message));
  }

  if (!sample) {
    redirect(buildRedirectUrl("error", "The selected sample is not accessible."));
  }

  const { data: variant, error: variantError } = await supabase
    .from("variants")
    .insert({
      acmg_criteria: acmgCriteria as Json,
      alt_allele: altAllele,
      chromosome,
      classification,
      gene,
      position,
      ref_allele: refAllele,
      sample_id: sampleId,
      zygosity,
    })
    .select("id")
    .single();

  if (variantError) {
    redirect(buildRedirectUrl("error", variantError.message));
  }

  if (annotationSources.length > 0) {
    const { error: annotationError } = await supabase.from("annotations").insert(
      annotationSources.map((source) => ({
        data: (annotationNote
          ? {
              captured_manually: true,
              note: annotationNote,
            }
          : { captured_manually: true }) as Json,
        source: source as AnnotationSource,
        variant_id: variant.id,
      })),
    );

    if (annotationError) {
      redirect(
        buildRedirectUrl(
          "error",
          `Variant was saved, but annotations could not be stored: ${annotationError.message}`,
        ),
      );
    }
  }

  if (sample.status !== "completed") {
    await supabase
      .from("genomic_samples")
      .update({ status: "completed" })
      .eq("id", sampleId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/samples");
  revalidatePath("/variants");
  revalidatePath("/reports");
  revalidatePath("/analytics");
  revalidatePath(`/patients/${sample.patient_id}`);

  redirect(buildRedirectUrl("success", "Variant and annotations saved successfully."));
}
