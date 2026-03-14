import Link from "next/link";
import type { Metadata } from "next";

import { getDashboardStats } from "@/lib/dashboard";
import { getPatientsList } from "@/lib/patients";
import { getSamplesList } from "@/lib/samples";

export const metadata: Metadata = {
  title: "Workflows | GenomeIQ",
  description: "Workflow orchestration and batch queue preview for GenomeIQ.",
};

interface WorkflowsPageProps {
  searchParams?: Promise<{
    focus?: string;
  }>;
}

const workflowTemplates = [
  {
    description:
      "Default must-have workflow: QC, variant parsing, annotation, interpretation handoff, and report packaging.",
    id: "triage",
    name: "Clinical triage pipeline",
    steps: ["QC", "Parse VCF", "Annotate", "Interpret", "Report"],
  },
  {
    description:
      "Optimized for drug-response review with targeted annotation and clinician confirmation.",
    id: "pgx",
    name: "Pharmacogenomics review",
    steps: ["QC", "Target genes", "Drug rules", "Clinical note"],
  },
  {
    description:
      "Designed for large cohorts, including queue fan-out and batch run monitoring.",
    id: "batch",
    name: "Batch processing engine",
    steps: ["Ingest", "Shard jobs", "Track queue", "Aggregate results"],
  },
] as const;

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function WorkflowsPage({ searchParams }: WorkflowsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const focus = params?.focus ?? workflowTemplates[0].id;
  const [stats, samples, patients] = await Promise.all([
    getDashboardStats(),
    getSamplesList(),
    getPatientsList(),
  ]);
  const selectedWorkflow =
    workflowTemplates.find((workflow) => workflow.id === focus) ?? workflowTemplates[0];
  const uploadedSamples = samples.filter((sample) => sample.status === "uploaded").length;
  const processingSamples = samples.filter((sample) => sample.status === "processing").length;
  const completedSamples = samples.filter((sample) => sample.status === "completed").length;
  const queueLanes = [
    {
      count: uploadedSamples,
      label: "Ready for parser",
      tone: "border-cyan-500/20 bg-cyan-500/10 text-cyan-100",
    },
    {
      count: processingSamples,
      label: "Active background jobs",
      tone: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    },
    {
      count: completedSamples,
      label: "Completed analyses",
      tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(14,116,144,0.22))] p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">
              Workflow Builder
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Pipeline templates and queue-state monitoring are now visible in UI.
            </h1>
            <p className="text-sm leading-6 text-slate-300">
              This page uses live patient and sample counts today, and stages the future Edge
              Function orchestration layer behind workflow templates and batch run previews.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
              href="/samples/upload"
            >
              Queue sample
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
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Patients in scope</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {formatCount(patients.length)}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Total samples</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-300">
              {formatCount(stats.totalSamples)}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Queued now</p>
            <p className="mt-2 text-3xl font-semibold text-amber-300">
              {formatCount(uploadedSamples + processingSamples)}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Completed pipelines
            </p>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">
              {formatCount(completedSamples)}
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <div className="flex flex-wrap gap-3">
          {workflowTemplates.map((workflow) => {
            const active = workflow.id === selectedWorkflow.id;

            return (
              <Link
                key={workflow.id}
                className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                  active
                    ? "border-cyan-400/30 bg-cyan-400/12 text-white"
                    : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                }`}
                href={`/workflows?focus=${workflow.id}`}
              >
                {workflow.name}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
              Selected Template
            </p>
            <h2 className="mt-3 text-2xl font-semibold text-white">{selectedWorkflow.name}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {selectedWorkflow.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {selectedWorkflow.steps.map((step, index) => (
                <span
                  key={step}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-200"
                >
                  {index + 1}. {step}
                </span>
              ))}
            </div>
          </article>

          <article className="rounded-[28px] border border-white/10 bg-black/20 p-5">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan-300">
              Queue Lanes
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {queueLanes.map((lane) => (
                <div
                  key={lane.label}
                  className={`rounded-2xl border p-4 ${lane.tone}`}
                >
                  <p className="text-xs uppercase tracking-[0.18em]">{lane.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{lane.count}</p>
                </div>
              ))}
            </div>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Batch Processing Preview
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Future Edge Function execution board
          </h2>
          <div className="mt-5 grid gap-3">
            {[
              {
                label: "Ingestion",
                note: `${uploadedSamples} uploaded files are waiting for parser fan-out.`,
              },
              {
                label: "Annotation",
                note: "Public database lookups and consequence mapping will attach here.",
              },
              {
                label: "Interpretation",
                note: "Clinical scoring, phenotype matching, and report drafting will run after annotation.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
              >
                <p className="text-sm font-semibold text-white">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-slate-400">{item.note}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Launch Points
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Paths you can validate immediately in the UI
          </h2>
          <div className="mt-5 grid gap-3">
            {[
              { href: "/samples/upload", label: "Upload a sample into the queue" },
              { href: "/samples", label: "Review current sample processing status" },
              { href: "/variants", label: "Open the downstream variant workbench" },
              { href: "/reports", label: "Inspect report queue and draft preview" },
            ].map((item) => (
              <Link
                key={item.href}
                className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </article>
      </section>
    </div>
  );
}
