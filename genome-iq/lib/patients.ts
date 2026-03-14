import { isMissingColumnError } from "@/lib/supabase/postgrest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, SampleStatus, VariantClassification } from "@/types";

export interface PatientListItem {
  created_at: string;
  date_of_birth: string | null;
  external_id: string;
  id: string;
  name: string;
  phenotypes: Json;
  gender: string | null;
}

export interface PatientSampleItem {
  created_at: string;
  file_name: string;
  id: string;
  sample_type: string;
  status: SampleStatus;
  variantCount: number;
}

export interface PatientVariantSummary {
  byClassification: { count: number; label: string }[];
  clinicallySignificant: number;
  topGenes: { count: number; gene: string }[];
  totalVariants: number;
}

export interface PatientDetailResult {
  patient: PatientListItem;
  samples: PatientSampleItem[];
  variantSummary: PatientVariantSummary;
}

const classificationLabels: Record<VariantClassification, string> = {
  benign: "Benign",
  likely_benign: "Likely benign",
  likely_pathogenic: "Likely pathogenic",
  pathogenic: "Pathogenic",
  uncertain: "Uncertain significance",
};

const patientSelectBase =
  "id, name, external_id, date_of_birth, phenotypes, created_at";
const patientSelectGender = `${patientSelectBase}, gender`;
const patientSelectSex = `${patientSelectBase}, sex`;
type PatientWithSex = Omit<PatientListItem, "gender"> & { sex?: string | null };

export function normalizePhenotypes(value: Json): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export function formatDate(value: string | null) {
  if (!value) {
    return "Not provided";
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function calculateAge(value: string | null) {
  if (!value) {
    return null;
  }

  const today = new Date();
  const birthDate = new Date(value);

  if (Number.isNaN(birthDate.getTime())) {
    return null;
  }

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age -= 1;
  }

  return age;
}

export async function getPatientsList() {
  const supabase = await createSupabaseServerClient();
  let { data, error } = await supabase
    .from("patients")
    .select(patientSelectGender)
    .order("created_at", { ascending: false });

  if (error && isMissingColumnError(error, "gender")) {
    const legacy = await supabase
      .from("patients")
      .select(patientSelectSex)
      .order("created_at", { ascending: false });

    if (legacy.error) {
      throw new Error(legacy.error.message);
    }

    const legacyRows = (legacy.data ?? []) as PatientWithSex[];

    return legacyRows.map(({ sex, ...rest }) => ({
      ...rest,
      gender: sex ?? null,
    })) as PatientListItem[];
  }

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as PatientListItem[];
}

export async function getPatientDetail(patientId: string) {
  const supabase = await createSupabaseServerClient();
  let { data: patient, error: patientError } = await supabase
    .from("patients")
    .select(patientSelectGender)
    .eq("id", patientId)
    .maybeSingle();

  if (patientError && isMissingColumnError(patientError, "gender")) {
    const legacy = await supabase
      .from("patients")
      .select(patientSelectSex)
      .eq("id", patientId)
      .maybeSingle();

    if (legacy.error) {
      throw new Error(legacy.error.message);
    }

    if (!legacy.data) {
      return null;
    }

    const { sex, ...rest } = legacy.data as PatientWithSex;

    patient = { ...rest, gender: sex ?? null } as PatientListItem;
    patientError = null;
  }

  if (patientError) {
    throw new Error(patientError.message);
  }

  if (!patient) {
    return null;
  }

  const { data: samplesData, error: samplesError } = await supabase
    .from("genomic_samples")
    .select("id, sample_type, file_name, status, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (samplesError) {
    throw new Error(samplesError.message);
  }

  const sampleIds = (samplesData ?? []).map((sample) => sample.id);
  let variantsData: { classification: VariantClassification; gene: string; sample_id: string }[] =
    [];

  if (sampleIds.length > 0) {
    const { data, error } = await supabase
      .from("variants")
      .select("sample_id, gene, classification")
      .in("sample_id", sampleIds);

    if (error) {
      throw new Error(error.message);
    }

    variantsData = (data ?? []) as {
      classification: VariantClassification;
      gene: string;
      sample_id: string;
    }[];
  }

  const variantCountsBySample = new Map<string, number>();

  for (const variant of variantsData) {
    variantCountsBySample.set(
      variant.sample_id,
      (variantCountsBySample.get(variant.sample_id) ?? 0) + 1,
    );
  }

  const samples: PatientSampleItem[] = (samplesData ?? []).map((sample) => ({
    ...sample,
    variantCount: variantCountsBySample.get(sample.id) ?? 0,
  })) as PatientSampleItem[];

  const classificationCounts = new Map<VariantClassification, number>();
  const geneCounts = new Map<string, number>();

  for (const variant of variantsData) {
    classificationCounts.set(
      variant.classification,
      (classificationCounts.get(variant.classification) ?? 0) + 1,
    );
    geneCounts.set(variant.gene, (geneCounts.get(variant.gene) ?? 0) + 1);
  }

  const byClassification = Array.from(classificationCounts.entries())
    .map(([classification, count]) => ({
      count,
      label: classificationLabels[classification],
    }))
    .sort((left, right) => right.count - left.count);

  const topGenes = Array.from(geneCounts.entries())
    .map(([gene, count]) => ({ count, gene }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);

  const clinicallySignificant = variantsData.filter(
    (variant) =>
      variant.classification === "pathogenic" ||
      variant.classification === "likely_pathogenic",
  ).length;

  return {
    patient: patient as PatientListItem,
    samples,
    variantSummary: {
      byClassification,
      clinicallySignificant,
      topGenes,
      totalVariants: variantsData.length,
    },
  } as PatientDetailResult;
}
