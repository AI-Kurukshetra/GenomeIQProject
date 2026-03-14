import Link from "next/link";
import type { Metadata } from "next";

import {
  createReportCommentAction,
  finalizeClinicalReportAction,
  generateClinicalReportAction,
} from "@/app/reports/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDashboardStats } from "@/lib/dashboard";
import { formatDate, getPatientsList, normalizePhenotypes } from "@/lib/patients";
import {
  getReportComments,
  getReportStatusClasses,
  getReportsList,
  getReportVersions,
} from "@/lib/reports";
import { getSamplesList } from "@/lib/samples";
import { getVariantsList } from "@/lib/variants";

export const metadata: Metadata = {
  title: "Reports | GenomeIQ",
  description: "Clinical reporting workspace for GenomeIQ.",
};

interface ReportsPageProps {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const [stats, reports, samples, patients, variants, reportVersions, reportComments] = await Promise.all([
    getDashboardStats(),
    getReportsList(),
    getSamplesList(),
    getPatientsList(),
    getVariantsList(),
    getReportVersions(),
    getReportComments(),
  ]);
  const finalizedReports = reports.filter((report) => report.status === "finalized").length;
  const reportSampleIds = new Set(reports.map((report) => report.sampleId));
  const variantCountsBySample = new Map<string, number>();

  for (const variant of variants) {
    variantCountsBySample.set(
      variant.sampleId,
      (variantCountsBySample.get(variant.sampleId) ?? 0) + 1,
    );
  }

  const eligibleSamples = samples.filter((sample) => (variantCountsBySample.get(sample.id) ?? 0) > 0);
  const readyQueue = samples.filter((sample) => !reportSampleIds.has(sample.id)).slice(0, 3);
  const leadReport = reports[0] ?? null;
  const leadReportVersions = leadReport
    ? reportVersions.filter((version) => version.reportId === leadReport.id).slice(0, 4)
    : [];
  const leadReportComments = leadReport
    ? reportComments.filter((comment) => comment.reportId === leadReport.id).slice(0, 4)
    : [];
  const previewCards = readyQueue.map((sample, index) => {
    const phenotypes =
      sample.patient?.id
        ? normalizePhenotypes(
            patients.find((patient) => patient.id === sample.patient?.id)?.phenotypes ?? [],
          )
        : [];

    return {
      headline: sample.patient?.name ?? `Case ${index + 1}`,
      patientCode: sample.patient?.external_id ?? "Case pending linkage",
      phenotypes,
      sampleFileName: sample.file_name,
      sampleStatus: sample.status,
      summary:
        variantCountsBySample.get(sample.id) && variantCountsBySample.get(sample.id)! > 0
          ? `${variantCountsBySample.get(sample.id)} stored variant calls are ready to be summarized in a clinician-facing report.`
          : "No variant rows are linked yet. Save variant data first, then generate a report from that real dataset.",
      variantCount: variantCountsBySample.get(sample.id) ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      {params?.success ? (
        <Alert variant="success">
          <AlertTitle>Report saved</AlertTitle>
          <AlertDescription>{params.success}</AlertDescription>
        </Alert>
      ) : null}
      {params?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Report could not be generated</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(6,78,59,0.24))] p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">
              Clinical Reports
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Generate and store clinical reports from real patient, sample, and variant data.
            </h1>
            <p className="text-sm leading-6 text-slate-300">
              This module now writes structured report content into Supabase. Reports are
              generated from the stored variant set for the chosen sample and immediately
              appear in the report registry and dashboard counts.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
              href="/variants"
            >
              Review variants
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              href="/analytics"
            >
              Open analytics
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Live reports</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {formatCount(stats.reportsGenerated)}
            </p>
            <p className="mt-2 text-sm text-slate-400">Rows stored in `clinical_reports`.</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Finalized</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">
              {formatCount(finalizedReports)}
            </p>
            <p className="mt-2 text-sm text-slate-400">Clinician-ready documents.</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Eligible samples
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-300">
              {formatCount(eligibleSamples.length)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Samples with stored variants and ready for report generation.
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Patients in scope</p>
            <p className="mt-2 text-3xl font-semibold text-fuchsia-300">
              {formatCount(patients.length)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Patient records available for clinician reporting.
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <div className="max-w-3xl space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
            Report Generator
          </p>
          <h2 className="text-3xl font-semibold text-white">Create a clinical report</h2>
          <p className="text-sm leading-6 text-slate-400">
            The generator composes summary, impression, significant variants, and
            recommendations from the selected sample&apos;s stored data.
          </p>
        </div>

        {eligibleSamples.length === 0 ? (
          <Alert className="mt-6" variant="destructive">
            <AlertTitle>No eligible samples</AlertTitle>
            <AlertDescription>
              Save at least one variant on a sample before generating a report.
            </AlertDescription>
          </Alert>
        ) : (
          <form action={generateClinicalReportAction} className="mt-6 space-y-6">
            <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-2">
                <Label htmlFor="sampleId">Sample</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="sampleId"
                  name="sampleId"
                  required
                >
                  <option value="">Select sample</option>
                  {eligibleSamples.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.file_name} | {sample.patient?.name ?? "Unknown patient"} |{" "}
                      {sample.patient?.external_id ?? "unlinked"} | variants:{" "}
                      {variantCountsBySample.get(sample.id) ?? 0}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Report Status</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="status"
                  name="status"
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="finalized">Finalized</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinicalContext">Clinical Context</Label>
              <textarea
                className="min-h-32 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="clinicalContext"
                name="clinicalContext"
                placeholder="Optional clinician note, family history, indication for testing, or interpretation context"
              />
            </div>

            <SubmitButton className="w-full sm:w-auto" pendingLabel="Generating report...">
              Generate Report
            </SubmitButton>
          </form>
        )}
      </section>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/60">
        <div className="grid gap-4 p-4 md:hidden">
          {reports.length > 0 ? (
            reports.map((report) => (
              <article
                key={report.id}
                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(148,163,184,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {report.patientName ?? "Patient pending"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-sky-700">
                      {report.patientExternalId ?? "unlinked"}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getReportStatusClasses(
                      report.status,
                    )}`}
                  >
                    {report.status}
                  </span>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="font-semibold text-slate-950">
                    {report.sampleFileName ?? "Unknown sample"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{report.contentSummary}</p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-700">
                    {report.variantCount} variants
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-700">
                    v{report.latestVersion || report.versionCount || 1}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-700">
                    {report.commentCount} comments
                  </span>
                </div>

                {report.phenotypes.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {report.phenotypes.slice(0, 2).map((phenotype) => (
                      <span
                        key={`${report.id}-${phenotype}`}
                        className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700"
                      >
                        {phenotype}
                      </span>
                    ))}
                  </div>
                ) : null}

                <p className="mt-4 text-sm text-slate-600">{formatDate(report.created_at)}</p>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
              No live reports yet.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-white/10 text-left">
            <thead className="bg-white/[0.03]">
              <tr className="text-xs uppercase tracking-[0.22em] text-slate-500">
                <th className="px-6 py-4 font-medium">Case</th>
                <th className="px-6 py-4 font-medium">Sample</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Variant count</th>
                <th className="px-6 py-4 font-medium">Summary</th>
                <th className="px-6 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {reports.length > 0 ? (
                reports.map((report) => (
                  <tr key={report.id} className="align-top text-sm text-slate-200">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-white">{report.patientName ?? "Patient pending"}</p>
                      <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
                        {report.patientExternalId ?? "unlinked"}
                      </p>
                      <div className="mt-2 flex max-w-sm flex-wrap gap-2">
                        {report.phenotypes.slice(0, 2).map((phenotype) => (
                          <span
                            key={`${report.id}-${phenotype}`}
                            className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100"
                          >
                            {phenotype}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-medium text-white">{report.sampleFileName ?? "Unknown sample"}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {report.sampleStatus ?? "status unavailable"}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getReportStatusClasses(
                          report.status,
                        )}`}
                      >
                        {report.status}
                      </span>
                      <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                        v{report.latestVersion || report.versionCount || 1} • {report.commentCount} comments
                      </p>
                    </td>
                    <td className="px-6 py-5 text-slate-300">{report.variantCount}</td>
                    <td className="px-6 py-5 text-slate-300">{report.contentSummary}</td>
                    <td className="px-6 py-5 text-slate-300">{formatDate(report.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={6}>
                    No live reports yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Draft Queue Preview
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Cases not reported yet
          </h2>
          <div className="mt-5 grid gap-3">
            {previewCards.length > 0 ? (
              previewCards.map((card) => (
                <div
                  key={`${card.patientCode}-${card.sampleFileName}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{card.headline}</p>
                      <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
                        {card.patientCode}
                      </p>
                    </div>
                    <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-100">
                      Pending report
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-300">{card.sampleFileName}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">{card.summary}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-300">
                      {card.sampleStatus}
                    </span>
                    <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100">
                      {card.variantCount} variants
                    </span>
                    {card.phenotypes.slice(0, 2).map((phenotype) => (
                      <span
                        key={`${card.patientCode}-${phenotype}`}
                        className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-[11px] text-cyan-100"
                      >
                        {phenotype}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                Samples with no report yet will appear here.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Stored Output
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Report content written to Supabase
          </h2>
          <div className="mt-5 grid gap-3">
            {[
              "Patient summary and phenotype context",
              "Structured impression and recommendations",
              "Significant variant highlight list",
              "Full stored variant snapshot at generation time",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Report Lifecycle
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Finalize and version an existing report
          </h2>
          {leadReport ? (
            <form action={finalizeClinicalReportAction} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reportId">Report</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  defaultValue={leadReport.id}
                  id="reportId"
                  name="reportId"
                >
                  {reports.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.patientName ?? "Unknown patient"} | {report.sampleFileName ?? "Unknown sample"} | current {report.status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="changeSummary">Change Summary</Label>
                <textarea
                  className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="changeSummary"
                  name="changeSummary"
                  placeholder="Describe what changed before final sign-off"
                />
              </div>
              <SubmitButton className="w-full sm:w-auto" pendingLabel="Finalizing...">
                Finalize Report
              </SubmitButton>
            </form>
          ) : (
            <p className="mt-5 text-sm text-slate-400">Generate a report first to start versioning.</p>
          )}

          <div className="mt-6 space-y-3">
            {leadReportVersions.length > 0 ? (
              leadReportVersions.map((version) => (
                <div
                  key={`${version.reportId}-${version.versionNumber}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">Version {version.versionNumber}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {formatDate(version.created_at)}
                    </p>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    {version.changeSummary ?? "No change summary recorded."}
                  </p>
                  <p className="mt-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                    {version.createdByEmail ?? "Workspace user"}
                  </p>
                </div>
              ))
            ) : (
              <p className="mt-5 text-sm text-slate-400">Report versions will appear here.</p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Report Collaboration
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Clinician and reviewer comments
          </h2>
          {leadReport ? (
            <form action={createReportCommentAction} className="mt-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="commentReportId">Report</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  defaultValue={leadReport.id}
                  id="commentReportId"
                  name="reportId"
                >
                  {reports.map((report) => (
                    <option key={report.id} value={report.id}>
                      {report.patientName ?? "Unknown patient"} | {report.sampleFileName ?? "Unknown sample"}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reportCommentBody">Comment</Label>
                <textarea
                  className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="reportCommentBody"
                  name="body"
                  placeholder="Add review guidance, sign-off notes, or interpretation discussion"
                />
              </div>
              <SubmitButton className="w-full sm:w-auto" pendingLabel="Saving comment...">
                Add Report Comment
              </SubmitButton>
            </form>
          ) : (
            <p className="mt-5 text-sm text-slate-400">Generate a report first to start collaboration.</p>
          )}

          <div className="mt-6 space-y-3">
            {leadReportComments.length > 0 ? (
              leadReportComments.map((comment) => (
                <div key={`${comment.reportId}-${comment.created_at}`} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">
                      {comment.authorEmail ?? "Workspace user"}
                    </p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      {formatDate(comment.created_at)}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-300">{comment.body}</p>
                </div>
              ))
            ) : (
              <p className="mt-5 text-sm text-slate-400">Report comments will appear here.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
