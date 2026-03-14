import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SampleStatus } from "@/types";

export interface SamplePatientOption {
  external_id: string;
  id: string;
  name: string;
}

export interface SampleListItem {
  created_at: string;
  file_name: string;
  file_path: string;
  file_size_bytes: number | null;
  id: string;
  parser_version: string | null;
  patient: SamplePatientOption | null;
  processing_completed_at: string | null;
  processing_started_at: string | null;
  qualityStatus: string | null;
  qualitySummary: string | null;
  sample_type: string;
  status: SampleStatus;
  variantCount: number;
}

export function getSampleStatusClasses(status: SampleStatus) {
  switch (status) {
    case "completed":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-100";
    case "failed":
      return "border-red-500/25 bg-red-500/10 text-red-100";
    case "processing":
      return "border-amber-500/25 bg-amber-500/10 text-amber-100";
    case "uploaded":
    default:
      return "border-cyan-500/25 bg-cyan-500/10 text-cyan-100";
  }
}

export async function getSamplesList() {
  const supabase = await createSupabaseServerClient();
  const [
    { data: samplesData, error: samplesError },
    { data: variantsData, error: variantsError },
    { data: qualityData, error: qualityError },
  ] = await Promise.all([
    supabase
      .from("genomic_samples")
      .select(
        "id, file_name, file_path, file_size_bytes, sample_type, status, created_at, processing_started_at, processing_completed_at, parser_version, patient:patients(id, name, external_id)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("variants").select("sample_id"),
    supabase
      .from("quality_metrics")
      .select("sample_id, metric_type, status, numeric_value, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (samplesError) {
    throw new Error(samplesError.message);
  }

  if (variantsError) {
    throw new Error(variantsError.message);
  }

  if (qualityError) {
    throw new Error(qualityError.message);
  }

  const variantCountsBySample = new Map<string, number>();

  for (const variant of variantsData ?? []) {
    variantCountsBySample.set(
      variant.sample_id,
      (variantCountsBySample.get(variant.sample_id) ?? 0) + 1,
    );
  }

  const qualityBySample = new Map<
    string,
    { status: string | null; summary: string | null }
  >();

  for (const metric of qualityData ?? []) {
    if (!qualityBySample.has(metric.sample_id)) {
      qualityBySample.set(metric.sample_id, {
        status: metric.status,
        summary:
          metric.metric_type === "parsed_variants" && metric.numeric_value !== null
            ? `${metric.numeric_value} parsed variants`
            : metric.metric_type.replace(/_/g, " "),
      });
    }
  }

  return (samplesData ?? []).map((sample) => ({
    ...sample,
    patient: sample.patient as SamplePatientOption | null,
    qualityStatus: qualityBySample.get(sample.id)?.status ?? null,
    qualitySummary: qualityBySample.get(sample.id)?.summary ?? null,
    status: sample.status as SampleStatus,
    variantCount: variantCountsBySample.get(sample.id) ?? 0,
  })) as SampleListItem[];
}

export async function getSampleUploadContext() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("patients")
    .select("id, name, external_id")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as SamplePatientOption[];
}

export async function getQualityMetrics(sampleId?: string) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("quality_metrics")
    .select("id, sample_id, metric_type, metric_value, numeric_value, status, details, created_at")
    .order("created_at", { ascending: false });

  if (sampleId) {
    query = query.eq("sample_id", sampleId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
