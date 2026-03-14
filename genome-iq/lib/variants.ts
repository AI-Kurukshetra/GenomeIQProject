import { normalizePhenotypes } from "@/lib/patients";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnnotationSource, SampleStatus, VariantClassification } from "@/types";

export interface VariantListItem {
  altAllele: string;
  annotationSources: AnnotationSource[];
  chromosome: string;
  classification: VariantClassification;
  created_at: string;
  gene: string;
  id: string;
  patientExternalId: string | null;
  patientId: string | null;
  patientName: string | null;
  phenotypes: string[];
  position: number;
  refAllele: string;
  sampleFileName: string | null;
  sampleId: string;
  sampleStatus: SampleStatus | null;
  zygosity: string;
}

export function formatVariantLocus(
  variant: Pick<VariantListItem, "altAllele" | "chromosome" | "position" | "refAllele">,
) {
  return `chr${variant.chromosome}:${new Intl.NumberFormat("en-US").format(variant.position)} ${variant.refAllele}>${variant.altAllele}`;
}

export function getVariantClassificationClasses(classification: VariantClassification) {
  switch (classification) {
    case "pathogenic":
      return "border-red-500/25 bg-red-500/10 text-red-100";
    case "likely_pathogenic":
      return "border-amber-500/25 bg-amber-500/10 text-amber-100";
    case "likely_benign":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-100";
    case "benign":
      return "border-cyan-500/25 bg-cyan-500/10 text-cyan-100";
    case "uncertain":
    default:
      return "border-white/15 bg-white/5 text-slate-200";
  }
}

export async function getVariantsList() {
  const supabase = await createSupabaseServerClient();
  const [
    { data: variantsData, error: variantsError },
    { data: annotationsData, error: annotationsError },
    { data: samplesData, error: samplesError },
    { data: patientsData, error: patientsError },
  ] = await Promise.all([
    supabase
      .from("variants")
      .select(
        "id, sample_id, gene, chromosome, position, ref_allele, alt_allele, zygosity, classification, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("annotations").select("variant_id, source"),
    supabase.from("genomic_samples").select("id, patient_id, file_name, status"),
    supabase.from("patients").select("id, name, external_id, phenotypes"),
  ]);

  if (variantsError) {
    throw new Error(variantsError.message);
  }

  if (annotationsError) {
    throw new Error(annotationsError.message);
  }

  if (samplesError) {
    throw new Error(samplesError.message);
  }

  if (patientsError) {
    throw new Error(patientsError.message);
  }

  const annotationSourcesByVariant = new Map<string, AnnotationSource[]>();

  for (const annotation of annotationsData ?? []) {
    const sources = annotationSourcesByVariant.get(annotation.variant_id) ?? [];

    if (!sources.includes(annotation.source as AnnotationSource)) {
      sources.push(annotation.source as AnnotationSource);
    }

    annotationSourcesByVariant.set(annotation.variant_id, sources);
  }

  const samplesById = new Map(
    (samplesData ?? []).map((sample) => [
      sample.id,
      {
        fileName: sample.file_name,
        patientId: sample.patient_id,
        status: sample.status as SampleStatus,
      },
    ]),
  );

  const patientsById = new Map(
    (patientsData ?? []).map((patient) => [
      patient.id,
      {
        externalId: patient.external_id,
        name: patient.name,
        phenotypes: normalizePhenotypes(patient.phenotypes),
      },
    ]),
  );

  return (variantsData ?? []).map((variant) => {
    const sample = samplesById.get(variant.sample_id);
    const patient = sample?.patientId ? patientsById.get(sample.patientId) : null;

    return {
      altAllele: variant.alt_allele,
      annotationSources: annotationSourcesByVariant.get(variant.id) ?? [],
      chromosome: variant.chromosome,
      classification: variant.classification as VariantClassification,
      created_at: variant.created_at,
      gene: variant.gene,
      id: variant.id,
      patientExternalId: patient?.externalId ?? null,
      patientId: sample?.patientId ?? null,
      patientName: patient?.name ?? null,
      phenotypes: patient?.phenotypes ?? [],
      position: variant.position,
      refAllele: variant.ref_allele,
      sampleFileName: sample?.fileName ?? null,
      sampleId: variant.sample_id,
      sampleStatus: sample?.status ?? null,
      zygosity: variant.zygosity,
    } satisfies VariantListItem;
  });
}
