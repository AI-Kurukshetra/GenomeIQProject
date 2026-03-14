"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDashboardContext } from "@/lib/dashboard";
import { isMissingColumnError } from "@/lib/supabase/postgrest";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnalysisStatus, ConsentStatus, Json, OmicsModality } from "@/types";

function buildPatientExternalId() {
  return `PT-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}

function buildRedirectUrl(message: string) {
  return `/patients/new?error=${encodeURIComponent(message)}`;
}

function buildPatientRedirect(
  patientId: string,
  type: "error" | "success",
  message: string,
) {
  return `/patients/${patientId}?${type}=${encodeURIComponent(message)}`;
}

function extractPhenotypeTerm(value: string) {
  const trimmed = value.trim();
  const hpoMatch = trimmed.match(/(HP:\d{7})/i);

  return {
    hpoId: hpoMatch ? hpoMatch[1].toUpperCase() : null,
    label: trimmed,
  };
}

export async function createPatientAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildRedirectUrl("Your organization context is not ready yet."));
  }

  const name = String(formData.get("name") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();
  const gender = String(formData.get("gender") ?? "").trim();
  const phenotypes = formData
    .getAll("phenotypes")
    .map((value) => String(value).trim())
    .filter(Boolean);

  if (!name) {
    redirect(buildRedirectUrl("Patient name is required."));
  }

  if (dateOfBirth) {
    const parsedDate = new Date(dateOfBirth);

    if (Number.isNaN(parsedDate.getTime()) || parsedDate > new Date()) {
      redirect(buildRedirectUrl("Date of birth must be a valid past date."));
    }
  }

  const supabase = await createSupabaseServerClient();
  const baseInsert = {
    date_of_birth: dateOfBirth || null,
    external_id: buildPatientExternalId(),
    name,
    org_id: context.organizationId,
    phenotypes,
  };
  const { data, error } = await supabase
    .from("patients")
    .insert({
      ...baseInsert,
      gender: gender || null,
    })
    .select("id")
    .single();

  if (error && isMissingColumnError(error, "gender")) {
    const legacyInsert = await supabase
      .from("patients")
      .insert({
        ...baseInsert,
        sex: gender || null,
      })
      .select("id")
      .single();

    if (legacyInsert.error) {
      redirect(buildRedirectUrl(legacyInsert.error.message));
    }

    redirect(`/patients/${legacyInsert.data.id}?created=1`);
  }

  if (error) {
    redirect(buildRedirectUrl(error.message));
  }

  if (phenotypes.length > 0) {
    const phenotypeRows = phenotypes.map((phenotype) => {
      const extracted = extractPhenotypeTerm(phenotype);

      return {
        hpo_id: extracted.hpoId,
        label: extracted.label,
        metadata: { imported_from_patient: true } as Json,
      };
    });

    await supabase.from("phenotype_terms").upsert(phenotypeRows, {
      ignoreDuplicates: true,
      onConflict: "hpo_id",
    });
  }

  redirect(`/patients/${data.id}?created=1`);
}

export async function createConsentAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildRedirectUrl("Your organization context is not ready yet."));
  }

  const patientId = String(formData.get("patientId") ?? "").trim();
  const consentScope = String(formData.get("consentScope") ?? "").trim();
  const status = String(formData.get("status") ?? "granted").trim() as ConsentStatus;
  const expiresAt = String(formData.get("expiresAt") ?? "").trim();
  const documentPath = String(formData.get("documentPath") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!patientId || !consentScope) {
    redirect(
      buildPatientRedirect(patientId || "unknown", "error", "Consent scope is required."),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("consents").insert({
    consent_scope: consentScope,
    document_path: documentPath || null,
    expires_at: expiresAt || null,
    metadata: notes ? ({ notes } as Json) : ({} as Json),
    organization_id: context.organizationId,
    patient_id: patientId,
    revoked_at: status === "revoked" ? new Date().toISOString() : null,
    status,
  });

  if (error) {
    redirect(buildPatientRedirect(patientId, "error", error.message));
  }

  revalidatePath(`/patients/${patientId}`);
  redirect(buildPatientRedirect(patientId, "success", "Consent record saved."));
}

export async function createCollaborationCommentAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildRedirectUrl("Your organization context is not ready yet."));
  }

  const patientId = String(formData.get("patientId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const sampleId = String(formData.get("sampleId") ?? "").trim();

  if (!patientId || !body) {
    redirect(
      buildPatientRedirect(patientId || "unknown", "error", "Comment text is required."),
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("collaboration_comments").insert({
    author_id: user?.id ?? null,
    body,
    organization_id: context.organizationId,
    patient_id: patientId,
    sample_id: sampleId || null,
  });

  if (error) {
    redirect(buildPatientRedirect(patientId, "error", error.message));
  }

  revalidatePath(`/patients/${patientId}`);
  redirect(buildPatientRedirect(patientId, "success", "Collaboration note added."));
}

export async function createOmicsDatasetAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildRedirectUrl("Your organization context is not ready yet."));
  }

  const patientId = String(formData.get("patientId") ?? "").trim();
  const sampleId = String(formData.get("sampleId") ?? "").trim();
  const modality = String(formData.get("modality") ?? "").trim() as OmicsModality;
  const status = String(formData.get("status") ?? "queued").trim() as AnalysisStatus;
  const fileName = String(formData.get("fileName") ?? "").trim();
  const filePath = String(formData.get("filePath") ?? "").trim();
  const summaryText = String(formData.get("summaryText") ?? "").trim();

  if (!patientId || !modality || !fileName || !filePath) {
    redirect(
      buildPatientRedirect(
        patientId || "unknown",
        "error",
        "Modality, file name, and file path are required.",
      ),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("omics_datasets").insert({
    file_name: fileName,
    file_path: filePath,
    modality,
    organization_id: context.organizationId,
    patient_id: patientId,
    sample_id: sampleId || null,
    status,
    summary: summaryText ? ({ summary: summaryText } as Json) : ({} as Json),
  });

  if (error) {
    redirect(buildPatientRedirect(patientId, "error", error.message));
  }

  revalidatePath(`/patients/${patientId}`);
  revalidatePath("/analytics");
  redirect(buildPatientRedirect(patientId, "success", "Omics dataset registered."));
}
