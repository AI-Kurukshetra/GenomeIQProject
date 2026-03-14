"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizePhenotypes } from "@/lib/patients";
import { getDashboardContext } from "@/lib/dashboard";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, ReportStatus } from "@/types";

function buildRedirectUrl(kind: "error" | "success", message: string) {
  return `/reports?${kind}=${encodeURIComponent(message)}`;
}

function buildClinicalSummary(input: {
  clinicalContext: string;
  patientExternalId: string;
  patientName: string;
  phenotypeTerms: string[];
  sampleFileName: string;
  sampleType: string;
  significantVariants: {
    classification: string;
    gene: string;
    locus: string;
    zygosity: string;
  }[];
  totalVariants: number;
}) {
  const phenotypeSummary =
    input.phenotypeTerms.length > 0
      ? input.phenotypeTerms.slice(0, 3).join(", ")
      : "no phenotype terms captured";
  const pathogenicCount = input.significantVariants.length;
  const variantSummary =
    pathogenicCount > 0
      ? `${pathogenicCount} clinically significant variant${pathogenicCount === 1 ? "" : "s"} identified.`
      : `${input.totalVariants} variant${input.totalVariants === 1 ? "" : "s"} identified with no pathogenic or likely pathogenic calls.`;

  return {
    impression:
      pathogenicCount > 0
        ? `Genomic review identified ${pathogenicCount} clinically significant finding${pathogenicCount === 1 ? "" : "s"} that should be correlated with phenotype and family history.`
        : "No clearly pathogenic findings were present in the currently stored variant set.",
    recommendations: [
      pathogenicCount > 0
        ? "Confirm clinically significant findings in the treating workflow before final sign-off."
        : "Review uncertain findings and expand annotation sources before final interpretation.",
      input.phenotypeTerms.length > 0
        ? `Correlate the current findings with phenotype terms: ${phenotypeSummary}.`
        : "Capture phenotype terms to improve downstream prioritization and reporting quality.",
      input.clinicalContext
        ? `Clinical note: ${input.clinicalContext}`
        : "No additional clinical context was provided at report generation time.",
    ],
    summary: `${input.patientName} (${input.patientExternalId}) sample ${input.sampleFileName} [${input.sampleType}] has ${variantSummary} Phenotype context: ${phenotypeSummary}.`,
  };
}

export async function generateClinicalReportAction(formData: FormData) {
  const context = await getDashboardContext();
  const sampleId = String(formData.get("sampleId") ?? "").trim();
  const status = String(formData.get("status") ?? "draft").trim() as ReportStatus;
  const clinicalContext = String(formData.get("clinicalContext") ?? "").trim();

  if (!context?.organizationId) {
    redirect(buildRedirectUrl("error", "Your organization context is not ready yet."));
  }

  if (!sampleId) {
    redirect(buildRedirectUrl("error", "Select a sample before generating a report."));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: {
      user,
    },
  } = await supabase.auth.getUser();
  const { data: sample, error: sampleError } = await supabase
    .from("genomic_samples")
    .select("id, patient_id, file_name, sample_type, status")
    .eq("id", sampleId)
    .maybeSingle();

  if (sampleError) {
    redirect(buildRedirectUrl("error", sampleError.message));
  }

  if (!sample) {
    redirect(buildRedirectUrl("error", "The selected sample is not accessible."));
  }

  const [{ data: patient, error: patientError }, { data: variants, error: variantsError }] =
    await Promise.all([
      supabase
        .from("patients")
        .select("id, name, external_id, phenotypes")
        .eq("id", sample.patient_id)
        .maybeSingle(),
      supabase
        .from("variants")
        .select(
          "id, gene, chromosome, position, ref_allele, alt_allele, zygosity, classification, acmg_criteria",
        )
        .eq("sample_id", sampleId)
        .order("created_at", { ascending: false }),
    ]);

  if (patientError) {
    redirect(buildRedirectUrl("error", patientError.message));
  }

  if (variantsError) {
    redirect(buildRedirectUrl("error", variantsError.message));
  }

  if (!patient) {
    redirect(buildRedirectUrl("error", "The patient linked to this sample could not be found."));
  }

  if (!variants || variants.length === 0) {
    redirect(
      buildRedirectUrl(
        "error",
        "This sample has no stored variants yet. Save variant data before generating a report.",
      ),
    );
  }

  const phenotypeTerms = normalizePhenotypes(patient.phenotypes);
  const significantVariants = variants
    .filter(
      (variant) =>
        variant.classification === "pathogenic" ||
        variant.classification === "likely_pathogenic",
    )
    .map((variant) => ({
      classification: variant.classification,
      gene: variant.gene,
      locus: `chr${variant.chromosome}:${variant.position} ${variant.ref_allele}>${variant.alt_allele}`,
      zygosity: variant.zygosity,
    }));
  const summaryBlock = buildClinicalSummary({
    clinicalContext,
    patientExternalId: patient.external_id,
    patientName: patient.name,
    phenotypeTerms,
    sampleFileName: sample.file_name,
    sampleType: sample.sample_type,
    significantVariants,
    totalVariants: variants.length,
  });

  const content = {
    clinical_context: clinicalContext || null,
    generated_at: new Date().toISOString(),
    impression: summaryBlock.impression,
    patient: {
      external_id: patient.external_id,
      id: patient.id,
      name: patient.name,
      phenotypes: phenotypeTerms,
    },
    recommendations: summaryBlock.recommendations,
    sample: {
      file_name: sample.file_name,
      id: sample.id,
      sample_type: sample.sample_type,
      status: sample.status,
    },
    significant_variants: significantVariants,
    summary: summaryBlock.summary,
    total_variants: variants.length,
    variants: variants.map((variant) => ({
      acmg_criteria: variant.acmg_criteria,
      classification: variant.classification,
      gene: variant.gene,
      locus: `chr${variant.chromosome}:${variant.position} ${variant.ref_allele}>${variant.alt_allele}`,
      zygosity: variant.zygosity,
    })),
  };

  const { data: report, error: reportError } = await supabase
    .from("clinical_reports")
    .insert({
      content: content as Json,
      created_by: user?.id ?? null,
      sample_id: sampleId,
      status,
    })
    .select("id")
    .single();

  if (reportError) {
    redirect(buildRedirectUrl("error", reportError.message));
  }

  const { error: versionError } = await supabase.from("report_versions").insert({
    change_summary: "Initial generated report snapshot.",
    content: content as Json,
    created_by: user?.id ?? null,
    organization_id: context.organizationId,
    report_id: report.id,
    version_number: 1,
  });

  if (versionError) {
    redirect(buildRedirectUrl("error", versionError.message));
  }

  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/analytics");
  revalidatePath(`/patients/${sample.patient_id}`);

  redirect(buildRedirectUrl("success", "Clinical report saved successfully."));
}

export async function finalizeClinicalReportAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildRedirectUrl("error", "Your organization context is not ready yet."));
  }

  const reportId = String(formData.get("reportId") ?? "").trim();
  const changeSummary = String(formData.get("changeSummary") ?? "").trim();

  if (!reportId) {
    redirect(buildRedirectUrl("error", "Choose a report before finalizing it."));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: report, error: reportError }, { data: versionsData, error: versionsError }] =
    await Promise.all([
      supabase
        .from("clinical_reports")
        .select("id, sample_id, content, status")
        .eq("id", reportId)
        .maybeSingle(),
      supabase
        .from("report_versions")
        .select("version_number")
        .eq("report_id", reportId)
        .order("version_number", { ascending: false })
        .limit(1),
    ]);

  if (reportError) {
    redirect(buildRedirectUrl("error", reportError.message));
  }

  if (versionsError) {
    redirect(buildRedirectUrl("error", versionsError.message));
  }

  if (!report) {
    redirect(buildRedirectUrl("error", "The selected report is not accessible."));
  }

  const nextVersionNumber = (versionsData?.[0]?.version_number ?? 0) + 1;
  const updatedContent = {
    ...(report.content && typeof report.content === "object" && !Array.isArray(report.content)
      ? report.content
      : {}),
    finalized_at: new Date().toISOString(),
  };

  const { error: updateError } = await supabase
    .from("clinical_reports")
    .update({
      content: updatedContent as Json,
      status: "finalized",
    })
    .eq("id", reportId);

  if (updateError) {
    redirect(buildRedirectUrl("error", updateError.message));
  }

  const { error: versionError } = await supabase.from("report_versions").insert({
    change_summary: changeSummary || "Report finalized for clinician delivery.",
    content: updatedContent as Json,
    created_by: user?.id ?? null,
    organization_id: context.organizationId,
    report_id: reportId,
    version_number: nextVersionNumber,
  });

  if (versionError) {
    redirect(buildRedirectUrl("error", versionError.message));
  }

  revalidatePath("/dashboard");
  revalidatePath("/reports");
  revalidatePath("/analytics");

  redirect(buildRedirectUrl("success", "Clinical report finalized and versioned."));
}

export async function createReportCommentAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildRedirectUrl("error", "Your organization context is not ready yet."));
  }

  const reportId = String(formData.get("reportId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!reportId || !body) {
    redirect(buildRedirectUrl("error", "Report and comment text are required."));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: report, error: reportError } = await supabase
    .from("clinical_reports")
    .select("id, sample_id")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    redirect(buildRedirectUrl("error", reportError.message));
  }

  if (!report) {
    redirect(buildRedirectUrl("error", "The selected report is not accessible."));
  }

  const { data: sample, error: sampleError } = await supabase
    .from("genomic_samples")
    .select("id, patient_id")
    .eq("id", report.sample_id)
    .maybeSingle();

  if (sampleError) {
    redirect(buildRedirectUrl("error", sampleError.message));
  }

  const { error } = await supabase.from("collaboration_comments").insert({
    author_id: user?.id ?? null,
    body,
    organization_id: context.organizationId,
    patient_id: sample?.patient_id ?? null,
    report_id: reportId,
    sample_id: report.sample_id,
  });

  if (error) {
    redirect(buildRedirectUrl("error", error.message));
  }

  revalidatePath("/reports");
  redirect(buildRedirectUrl("success", "Report comment added."));
}
