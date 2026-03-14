import Link from "next/link";
import type { Metadata } from "next";

import { processSampleAction } from "@/app/samples/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatDate } from "@/lib/patients";
import { getSamplesList, getSampleStatusClasses } from "@/lib/samples";

export const metadata: Metadata = {
  title: "Samples | GenomeIQ",
  description: "Sample uploads and processing states for GenomeIQ.",
};

interface SamplesPageProps {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
}

function getQcClasses(status: string | null) {
  switch (status) {
    case "pass":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-100";
    case "warning":
    case "review":
      return "border-amber-500/25 bg-amber-500/10 text-amber-100";
    case "failed":
      return "border-red-500/25 bg-red-500/10 text-red-100";
    default:
      return "border-white/10 bg-white/5 text-slate-300";
  }
}

export default async function SamplesPage({ searchParams }: SamplesPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const samples = await getSamplesList();

  return (
    <div className="space-y-6">
      {params?.success ? (
        <Alert variant="success">
          <AlertTitle>Sample updated</AlertTitle>
          <AlertDescription>{params.success}</AlertDescription>
        </Alert>
      ) : null}
      {params?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Sample action failed</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
              Sample Registry
            </p>
            <h1 className="text-3xl font-semibold text-white">Uploaded samples</h1>
            <p className="text-sm leading-6 text-slate-400">
              Review all genomic sample records that belong to the current organization and
              trigger the automated VCF parser, QC capture, and downstream variant storage.
            </p>
          </div>

          <Link
            className="ui-button inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-slate-950 shadow-[0_0_30px_rgba(0,212,255,0.24)] transition-colors hover:bg-cyan-300"
            href="/samples/upload"
          >
            Upload Sample
          </Link>
        </div>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/60">
        <div className="grid gap-4 p-4 md:hidden">
          {samples.length > 0 ? (
            samples.map((sample) => (
              <article
                key={sample.id}
                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(148,163,184,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-950">{sample.file_name}</p>
                    <p className="mt-1 truncate font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {sample.file_path}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getSampleStatusClasses(
                      sample.status,
                    )}`}
                  >
                    {sample.status}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Patient</p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {sample.patient?.name ?? "Patient unavailable"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-sky-700">
                      {sample.patient?.external_id ?? "unlinked"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Sample</p>
                    <p className="mt-2 capitalize font-semibold text-slate-950">
                      {sample.sample_type.replace(/_/g, " ")}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {sample.variantCount} variants
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                  <span>{formatDate(sample.created_at)}</span>
                  {sample.qualityStatus ? (
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getQcClasses(
                        sample.qualityStatus,
                      )}`}
                    >
                      QC {sample.qualityStatus}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4">
                  {sample.status === "uploaded" || sample.status === "failed" ? (
                    <form action={processSampleAction}>
                      <input name="sampleId" type="hidden" value={sample.id} />
                      <SubmitButton
                        className="w-full rounded-xl"
                        pendingLabel="Processing..."
                      >
                        Process Sample
                      </SubmitButton>
                    </form>
                  ) : sample.status === "completed" ? (
                    <Link
                      className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-100"
                      href="/variants"
                    >
                      Review variants
                    </Link>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
                      In progress
                    </div>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
              No samples uploaded yet.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-white/10 text-left">
            <thead className="bg-white/[0.03]">
              <tr className="text-xs uppercase tracking-[0.22em] text-slate-500">
                <th className="px-6 py-4 font-medium">File</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Sample Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Variants</th>
                <th className="px-6 py-4 font-medium">QC</th>
                <th className="px-6 py-4 font-medium">Created</th>
                <th className="px-6 py-4 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {samples.length > 0 ? (
                samples.map((sample) => (
                  <tr key={sample.id} className="text-sm text-slate-200">
                    <td className="px-6 py-5">
                      <p className="font-medium text-white">{sample.file_name}</p>
                      <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                        {sample.file_path}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      {sample.patient ? (
                        <div>
                          <p className="font-medium text-white">{sample.patient.name}</p>
                          <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
                            {sample.patient.external_id}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-500">Patient unavailable</span>
                      )}
                    </td>
                    <td className="px-6 py-5 capitalize text-slate-300">
                      {sample.sample_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getSampleStatusClasses(
                          sample.status,
                        )}`}
                      >
                        {sample.status}
                      </span>
                      {sample.parser_version ? (
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {sample.parser_version}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-5 text-slate-300">
                      <p>{sample.variantCount}</p>
                      {sample.file_size_bytes ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {(sample.file_size_bytes / 1024).toFixed(1)} KB
                        </p>
                      ) : null}
                    </td>
                    <td className="px-6 py-5">
                      {sample.qualityStatus ? (
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getQcClasses(
                              sample.qualityStatus,
                            )}`}
                          >
                            {sample.qualityStatus}
                          </span>
                          {sample.qualitySummary ? (
                            <p className="text-xs text-slate-400">{sample.qualitySummary}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="text-slate-500">Not run yet</span>
                      )}
                    </td>
                    <td className="px-6 py-5 text-slate-300">{formatDate(sample.created_at)}</td>
                    <td className="px-6 py-5">
                      {sample.status === "uploaded" || sample.status === "failed" ? (
                        <form action={processSampleAction}>
                          <input name="sampleId" type="hidden" value={sample.id} />
                          <SubmitButton
                            className="h-10 rounded-xl px-4 text-xs"
                            pendingLabel="Processing..."
                          >
                            Process Sample
                          </SubmitButton>
                        </form>
                      ) : sample.status === "completed" ? (
                        <Link
                          className="text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
                          href="/variants"
                        >
                          Review variants
                        </Link>
                      ) : (
                        <span className="text-slate-500">In progress</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={8}>
                    No genomic samples available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
