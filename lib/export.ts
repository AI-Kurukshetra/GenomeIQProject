import { isMissingColumnError } from "@/lib/supabase/postgrest";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function buildDataExportBundle() {
  const supabase = await createSupabaseServerClient();
  const patientSelectBase =
    "id, external_id, name, date_of_birth, phenotypes, created_at";
  const patientSelectGender = `${patientSelectBase}, gender`;
  const patientSelectSex = `${patientSelectBase}, sex`;

  const { data: patients, error: patientsError } = await supabase
    .from("patients")
    .select(patientSelectGender)
    .order("created_at", { ascending: false });

  type PatientRow = NonNullable<typeof patients>[number];
  type LegacyPatientRow = Omit<PatientRow, "gender"> & { sex?: string | null };

  let resolvedPatients: PatientRow[] | null = patients;
  let resolvedPatientsError = patientsError;

  if (patientsError && isMissingColumnError(patientsError, "gender")) {
    const legacyPatients = await supabase
      .from("patients")
      .select(patientSelectSex)
      .order("created_at", { ascending: false });

    if (legacyPatients.error) {
      resolvedPatientsError = legacyPatients.error;
    } else {
      const legacyRows = (legacyPatients.data ?? []) as LegacyPatientRow[];

      resolvedPatients = legacyRows.map(({ sex, ...rest }) => ({
        ...rest,
        gender: sex ?? null,
      }));
      resolvedPatientsError = null;
    }
  }

  const [
    { data: samples, error: samplesError },
    { data: variants, error: variantsError },
    { data: reports, error: reportsError },
    { data: consents, error: consentsError },
  ] = await Promise.all([
    supabase
      .from("genomic_samples")
      .select(
        "id, patient_id, file_name, file_path, sample_type, status, processing_started_at, processing_completed_at, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("variants")
      .select(
        "id, sample_id, gene, chromosome, position, ref_allele, alt_allele, zygosity, classification, transcript, hgvs_c, hgvs_p, consequence, created_at",
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("clinical_reports")
      .select("id, sample_id, status, created_at, content")
      .order("created_at", { ascending: false }),
    supabase
      .from("consents")
      .select("id, patient_id, consent_scope, status, granted_at, expires_at, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (resolvedPatientsError) {
    throw new Error(resolvedPatientsError.message);
  }

  if (samplesError) {
    throw new Error(samplesError.message);
  }

  if (variantsError) {
    throw new Error(variantsError.message);
  }

  if (reportsError) {
    throw new Error(reportsError.message);
  }

  if (consentsError) {
    throw new Error(consentsError.message);
  }

  return {
    exported_at: new Date().toISOString(),
    resources: {
      consents: consents ?? [],
      patients: resolvedPatients ?? [],
      reports: reports ?? [],
      samples: samples ?? [],
      variants: variants ?? [],
    },
    summary: {
      consents: consents?.length ?? 0,
      patients: resolvedPatients?.length ?? 0,
      reports: reports?.length ?? 0,
      samples: samples?.length ?? 0,
      variants: variants?.length ?? 0,
    },
  };
}
