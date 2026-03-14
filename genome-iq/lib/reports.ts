import { normalizePhenotypes } from "@/lib/patients";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json, ReportStatus, SampleStatus } from "@/types";

export interface ReportListItem {
  commentCount: number;
  contentSummary: string;
  created_at: string;
  id: string;
  latestVersion: number;
  patientExternalId: string | null;
  patientId: string | null;
  patientName: string | null;
  phenotypes: string[];
  sampleFileName: string | null;
  sampleId: string;
  sampleStatus: SampleStatus | null;
  status: ReportStatus;
  variantCount: number;
  versionCount: number;
}

export interface ReportVersionListItem {
  changeSummary: string | null;
  created_at: string;
  createdByEmail: string | null;
  reportId: string;
  versionNumber: number;
}

export interface ReportCommentListItem {
  authorEmail: string | null;
  body: string;
  created_at: string;
  reportId: string;
}

function summarizeReportContent(content: Json) {
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    return "Structured report sections will appear here once the reporting engine writes content.";
  }

  const summary = content.summary;

  if (typeof summary === "string" && summary.trim()) {
    return summary;
  }

  const impression = content.impression;

  if (typeof impression === "string" && impression.trim()) {
    return impression;
  }

  return "Structured report sections will appear here once the reporting engine writes content.";
}

export function getReportStatusClasses(status: ReportStatus) {
  return status === "finalized"
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-100"
    : "border-amber-500/25 bg-amber-500/10 text-amber-100";
}

export async function getReportsList() {
  const supabase = await createSupabaseServerClient();
  const [
    { data: reportsData, error: reportsError },
    { data: samplesData, error: samplesError },
    { data: patientsData, error: patientsError },
    { data: variantsData, error: variantsError },
    { data: reportVersionsData, error: reportVersionsError },
    { data: reportCommentsData, error: reportCommentsError },
  ] = await Promise.all([
    supabase
      .from("clinical_reports")
      .select("id, sample_id, status, content, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("genomic_samples").select("id, patient_id, file_name, status"),
    supabase.from("patients").select("id, name, external_id, phenotypes"),
    supabase.from("variants").select("sample_id"),
    supabase.from("report_versions").select("report_id, version_number"),
    supabase.from("collaboration_comments").select("report_id"),
  ]);

  if (reportsError) {
    throw new Error(reportsError.message);
  }

  if (samplesError) {
    throw new Error(samplesError.message);
  }

  if (patientsError) {
    throw new Error(patientsError.message);
  }

  if (variantsError) {
    throw new Error(variantsError.message);
  }

  if (reportVersionsError) {
    throw new Error(reportVersionsError.message);
  }

  if (reportCommentsError) {
    throw new Error(reportCommentsError.message);
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

  const variantCountsBySample = new Map<string, number>();
  const versionSummaryByReport = new Map<string, { count: number; latest: number }>();
  const commentCountsByReport = new Map<string, number>();

  for (const variant of variantsData ?? []) {
    variantCountsBySample.set(
      variant.sample_id,
      (variantCountsBySample.get(variant.sample_id) ?? 0) + 1,
    );
  }

  for (const version of reportVersionsData ?? []) {
    const existing = versionSummaryByReport.get(version.report_id) ?? { count: 0, latest: 0 };

    versionSummaryByReport.set(version.report_id, {
      count: existing.count + 1,
      latest: Math.max(existing.latest, version.version_number),
    });
  }

  for (const comment of reportCommentsData ?? []) {
    if (!comment.report_id) {
      continue;
    }

    commentCountsByReport.set(
      comment.report_id,
      (commentCountsByReport.get(comment.report_id) ?? 0) + 1,
    );
  }

  return (reportsData ?? []).map((report) => {
    const sample = samplesById.get(report.sample_id);
    const patient = sample?.patientId ? patientsById.get(sample.patientId) : null;
    const versionSummary = versionSummaryByReport.get(report.id);

    return {
      commentCount: commentCountsByReport.get(report.id) ?? 0,
      contentSummary: summarizeReportContent(report.content),
      created_at: report.created_at,
      id: report.id,
      latestVersion: versionSummary?.latest ?? 0,
      patientExternalId: patient?.externalId ?? null,
      patientId: sample?.patientId ?? null,
      patientName: patient?.name ?? null,
      phenotypes: patient?.phenotypes ?? [],
      sampleFileName: sample?.fileName ?? null,
      sampleId: report.sample_id,
      sampleStatus: sample?.status ?? null,
      status: report.status as ReportStatus,
      variantCount: variantCountsBySample.get(report.sample_id) ?? 0,
      versionCount: versionSummary?.count ?? 0,
    } satisfies ReportListItem;
  });
}

export async function getReportVersions(reportId?: string) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("report_versions")
    .select("report_id, version_number, change_summary, created_by, created_at")
    .order("created_at", { ascending: false });

  if (reportId) {
    query = query.eq("report_id", reportId);
  }

  const [{ data: versionsData, error: versionsError }, { data: usersData, error: usersError }] =
    await Promise.all([
      query,
      supabase.from("users").select("id, email"),
    ]);

  if (versionsError) {
    throw new Error(versionsError.message);
  }

  if (usersError) {
    throw new Error(usersError.message);
  }

  const usersById = new Map((usersData ?? []).map((user) => [user.id, user.email]));

  return (versionsData ?? []).map((version) => ({
    changeSummary: version.change_summary,
    created_at: version.created_at,
    createdByEmail: version.created_by ? usersById.get(version.created_by) ?? null : null,
    reportId: version.report_id,
    versionNumber: version.version_number,
  })) as ReportVersionListItem[];
}

export async function getReportComments(reportId?: string) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("collaboration_comments")
    .select("report_id, author_id, body, created_at")
    .not("report_id", "is", null)
    .order("created_at", { ascending: false });

  if (reportId) {
    query = query.eq("report_id", reportId);
  }

  const [{ data: commentsData, error: commentsError }, { data: usersData, error: usersError }] =
    await Promise.all([
      query,
      supabase.from("users").select("id, email"),
    ]);

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  if (usersError) {
    throw new Error(usersError.message);
  }

  const usersById = new Map((usersData ?? []).map((user) => [user.id, user.email]));

  return (commentsData ?? []).map((comment) => ({
    authorEmail: comment.author_id ? usersById.get(comment.author_id) ?? null : null,
    body: comment.body,
    created_at: comment.created_at,
    reportId: comment.report_id!,
  })) as ReportCommentListItem[];
}
