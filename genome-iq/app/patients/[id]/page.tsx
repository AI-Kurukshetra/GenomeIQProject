import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import {
  createCollaborationCommentAction,
  createConsentAction,
  createOmicsDatasetAction,
} from "@/app/patients/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  calculateAge,
  formatDate,
  getPatientDetail,
  normalizePhenotypes,
} from "@/lib/patients";
import { getPatientFeatureData } from "@/lib/platform-features";
import type { Json } from "@/types";

export const metadata: Metadata = {
  title: "Patient Detail | GenomeIQ",
  description: "Detailed patient record view for GenomeIQ.",
};

interface PatientDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    created?: string;
    error?: string;
    success?: string;
  }>;
}

function getConsentStatusClasses(status: string) {
  switch (status) {
    case "granted":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-100";
    case "revoked":
      return "border-red-500/25 bg-red-500/10 text-red-100";
    case "expired":
      return "border-amber-500/25 bg-amber-500/10 text-amber-100";
    default:
      return "border-white/15 bg-white/5 text-slate-200";
  }
}

function getOmicsStatusClasses(status: string) {
  switch (status) {
    case "completed":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-100";
    case "processing":
      return "border-amber-500/25 bg-amber-500/10 text-amber-100";
    case "failed":
      return "border-red-500/25 bg-red-500/10 text-red-100";
    case "queued":
    default:
      return "border-cyan-500/25 bg-cyan-500/10 text-cyan-100";
  }
}

function extractNotes(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return typeof metadata.notes === "string" ? metadata.notes : null;
}

function extractSummary(metadata: Json) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return typeof metadata.summary === "string" ? metadata.summary : null;
}

export default async function PatientDetailPage({
  params,
  searchParams,
}: PatientDetailPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : undefined;
  const [detail, featureData] = await Promise.all([
    getPatientDetail(id),
    getPatientFeatureData(id),
  ]);

  if (!detail) {
    notFound();
  }

  const age = calculateAge(detail.patient.date_of_birth);
  const phenotypes = normalizePhenotypes(detail.patient.phenotypes);

  return (
    <div className="space-y-6">
      {query?.created === "1" ? (
        <Alert variant="success">
          <AlertTitle>Patient created</AlertTitle>
          <AlertDescription>
            The record is now available in your organization workspace.
          </AlertDescription>
        </Alert>
      ) : null}
      {query?.success ? (
        <Alert variant="success">
          <AlertTitle>Update saved</AlertTitle>
          <AlertDescription>{query.success}</AlertDescription>
        </Alert>
      ) : null}
      {query?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Update failed</AlertTitle>
          <AlertDescription>{query.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-8">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-2">
            <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
              {detail.patient.external_id}
            </p>
            <h1 className="text-3xl font-semibold text-white">{detail.patient.name}</h1>
            <p className="text-sm text-slate-400">
              Patient detail view with phenotype context, linked samples, consent records,
              omics datasets, and collaboration activity.
            </p>
          </div>

          <Link
            className="text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
            href="/patients"
          >
            Back to patients
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">DOB</p>
          <p className="mt-3 text-lg font-semibold text-white">
            {formatDate(detail.patient.date_of_birth)}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {age === null ? "Age unavailable" : `${age} years old`}
          </p>
        </article>
        <article className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Gender</p>
          <p className="mt-3 text-lg font-semibold capitalize text-white">
            {detail.patient.gender ?? "Not provided"}
          </p>
        </article>
        <article className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Samples</p>
          <p className="mt-3 text-lg font-semibold text-white">{detail.samples.length}</p>
        </article>
        <article className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
            Variants found
          </p>
          <p className="mt-3 text-lg font-semibold text-white">
            {detail.variantSummary.totalVariants}
          </p>
          <p className="mt-1 text-sm text-slate-400">
            {detail.variantSummary.clinicallySignificant} pathogenic or likely pathogenic
          </p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-300">
            Phenotypes
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {phenotypes.length > 0 ? (
              phenotypes.map((phenotype) => (
                <span
                  key={phenotype}
                  className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-100"
                >
                  {phenotype}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-400">No phenotypes captured yet.</p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-7">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-300">
            Quick Variant Summary
          </p>
          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm text-slate-400">By classification</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.variantSummary.byClassification.length > 0 ? (
                  detail.variantSummary.byClassification.map((classification) => (
                    <span
                      key={classification.label}
                      className="rounded-full border border-white/10 bg-black/20 px-3 py-1 text-sm text-slate-200"
                    >
                      {classification.label}: {classification.count}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">No variants yet.</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-slate-400">Top genes</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {detail.variantSummary.topGenes.length > 0 ? (
                  detail.variantSummary.topGenes.map((gene) => (
                    <span
                      key={gene.gene}
                      className="rounded-full border border-white/10 bg-black/20 px-3 py-1 font-mono text-sm text-cyan-200"
                    >
                      {gene.gene} ({gene.count})
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">No gene calls available.</span>
                )}
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-300">
            Consent Management
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Track patient consent</h2>
          <form action={createConsentAction} className="mt-5 space-y-4">
            <input name="patientId" type="hidden" value={detail.patient.id} />
            <div className="space-y-2">
              <Label htmlFor="consentScope">Consent Scope</Label>
              <Input
                id="consentScope"
                name="consentScope"
                placeholder="Clinical interpretation, research reuse, external sharing"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="consentStatus">Status</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="consentStatus"
                  name="status"
                >
                  <option value="granted">Granted</option>
                  <option value="revoked">Revoked</option>
                  <option value="expired">Expired</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At</Label>
                <Input id="expiresAt" name="expiresAt" type="datetime-local" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="documentPath">Document Path</Label>
              <Input
                id="documentPath"
                name="documentPath"
                placeholder="consents/patient-123/clinical-consent.pdf"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="consentNotes">Notes</Label>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="consentNotes"
                name="notes"
                placeholder="Free-text note for consent tracking"
              />
            </div>
            <SubmitButton className="w-full sm:w-auto" pendingLabel="Saving consent...">
              Save Consent
            </SubmitButton>
          </form>

          <div className="mt-6 space-y-3">
            {featureData.consents.length > 0 ? (
              featureData.consents.map((consent) => (
                <div
                  key={consent.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{consent.consentScope}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Granted {formatDate(consent.created_at)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getConsentStatusClasses(
                        consent.status,
                      )}`}
                    >
                      {consent.status}
                    </span>
                  </div>
                  {extractNotes(consent.metadata) ? (
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {extractNotes(consent.metadata)}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                    {consent.expiresAt ? <span>Expires {formatDate(consent.expiresAt)}</span> : null}
                    {consent.documentPath ? <span>{consent.documentPath}</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No consent records saved yet.</p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-300">
            Collaboration Workspace
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Team notes</h2>
          <form action={createCollaborationCommentAction} className="mt-5 space-y-4">
            <input name="patientId" type="hidden" value={detail.patient.id} />
            <div className="space-y-2">
              <Label htmlFor="commentSampleId">Related Sample</Label>
              <select
                className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="commentSampleId"
                name="sampleId"
              >
                <option value="">No specific sample</option>
                {detail.samples.map((sample) => (
                  <option key={sample.id} value={sample.id}>
                    {sample.file_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="body">Comment</Label>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="body"
                name="body"
                placeholder="Add a note for clinicians and researchers working on this case"
                required
              />
            </div>
            <SubmitButton className="w-full sm:w-auto" pendingLabel="Saving comment...">
              Add Comment
            </SubmitButton>
          </form>

          <div className="mt-6 space-y-3">
            {featureData.collaboration.length > 0 ? (
              featureData.collaboration.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
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
              <p className="text-sm text-slate-400">No collaboration notes yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-300">
            Multi-Omics Integration
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Register additional datasets</h2>
          <form action={createOmicsDatasetAction} className="mt-5 space-y-4">
            <input name="patientId" type="hidden" value={detail.patient.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modality">Modality</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="modality"
                  name="modality"
                  required
                >
                  <option value="">Select modality</option>
                  <option value="genomics">Genomics</option>
                  <option value="transcriptomics">Transcriptomics</option>
                  <option value="proteomics">Proteomics</option>
                  <option value="epigenomics">Epigenomics</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="omicsStatus">Status</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="omicsStatus"
                  name="status"
                >
                  <option value="queued">Queued</option>
                  <option value="processing">Processing</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="omicsSampleId">Linked Sample</Label>
              <select
                className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="omicsSampleId"
                name="sampleId"
              >
                <option value="">No linked sample</option>
                {detail.samples.map((sample) => (
                  <option key={sample.id} value={sample.id}>
                    {sample.file_name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fileName">File Name</Label>
                <Input id="fileName" name="fileName" placeholder="rna_expression.tsv" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filePath">File Path</Label>
                <Input
                  id="filePath"
                  name="filePath"
                  placeholder="omics/patient-123/rna_expression.tsv"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="summaryText">Summary</Label>
              <textarea
                className="min-h-24 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="summaryText"
                name="summaryText"
                placeholder="Short note about the omics dataset"
              />
            </div>
            <SubmitButton className="w-full sm:w-auto" pendingLabel="Registering dataset...">
              Register Dataset
            </SubmitButton>
          </form>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-300">
            Omics Datasets
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Stored patient datasets</h2>
          <div className="mt-5 space-y-3">
            {featureData.omicsDatasets.length > 0 ? (
              featureData.omicsDatasets.map((dataset) => (
                <div
                  key={dataset.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{dataset.fileName}</p>
                      <p className="mt-1 text-sm text-slate-400">{dataset.filePath}</p>
                    </div>
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getOmicsStatusClasses(
                        dataset.status,
                      )}`}
                    >
                      {dataset.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    <span>{dataset.modality}</span>
                    {dataset.sampleFileName ? <span>{dataset.sampleFileName}</span> : null}
                    <span>{formatDate(dataset.created_at)}</span>
                  </div>
                  {extractSummary(dataset.summary) ? (
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      {extractSummary(dataset.summary)}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No omics datasets registered yet.</p>
            )}
          </div>
        </article>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/60">
        <div className="border-b border-white/10 px-6 py-5">
          <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-300">
            Patient Samples
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left">
            <thead className="bg-white/[0.03]">
              <tr className="text-xs uppercase tracking-[0.22em] text-slate-500">
                <th className="px-6 py-4 font-medium">File</th>
                <th className="px-6 py-4 font-medium">Sample Type</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Variants</th>
                <th className="px-6 py-4 font-medium">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {detail.samples.length > 0 ? (
                detail.samples.map((sample) => (
                  <tr key={sample.id} className="text-sm text-slate-200">
                    <td className="px-6 py-5">
                      <p className="font-medium text-white">{sample.file_name}</p>
                      <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-slate-500">
                        {sample.id}
                      </p>
                    </td>
                    <td className="px-6 py-5 capitalize text-slate-300">
                      {sample.sample_type}
                    </td>
                    <td className="px-6 py-5 capitalize text-slate-300">{sample.status}</td>
                    <td className="px-6 py-5 text-slate-300">{sample.variantCount}</td>
                    <td className="px-6 py-5 text-slate-300">{formatDate(sample.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={5}>
                    No samples are attached to this patient yet.
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
