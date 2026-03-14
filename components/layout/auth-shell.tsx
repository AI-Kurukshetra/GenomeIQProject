import type { ReactNode } from "react";

interface AuthShellProps {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
  badge: string;
}

const platformMetrics = [
  { label: "Use Case", value: "Hereditary Cancer" },
  { label: "Pipeline", value: "VCF -> AI Interpretation" },
  { label: "Security", value: "Org-scoped RLS" },
];

export function AuthShell({
  title,
  description,
  children,
  footer,
  badge,
}: AuthShellProps) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="relative mx-auto grid min-h-screen max-w-[1480px] grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="hidden border-r border-slate-200 bg-white/74 px-10 py-12 lg:flex lg:flex-col lg:justify-between xl:px-14">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-950 text-sm font-semibold tracking-[0.28em] text-white shadow-[0_14px_28px_rgba(17,24,39,0.18)]">
                GI
              </div>
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.34em] text-slate-400">
                  GenomeIQ
                </p>
                <p className="text-lg font-semibold text-slate-950">AI-powered scheduling for genomics work</p>
              </div>
            </div>
            <div className="space-y-5">
              <p className="font-mono text-xs uppercase tracking-[0.36em] text-slate-400">
                Precision Oncology Workspace
              </p>
              <h1 className="max-w-xl text-5xl font-semibold leading-tight text-slate-950">
                Variant intelligence designed for clinical genomics teams.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600">
                Upload germline VCFs, interpret hereditary cancer variants, and
                deliver structured reports in a single secured workspace.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              {platformMetrics.map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_28px_rgba(148,163,184,0.12)]"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    {metric.label}
                  </p>
                  <p className="mt-3 font-mono text-sm text-slate-950">
                    {metric.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_34px_rgba(148,163,184,0.14)]">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
                <span>Sample Trace</span>
                <span className="rounded-full bg-slate-950 px-3 py-1 font-mono text-white">BRCA1 c.68_69delAG</span>
              </div>
              <div className="mt-6 space-y-3">
                {[
                  "Ingestion validated for VCF 4.2 headers",
                  "Phenotype tags mapped to HPO-ready JSON",
                  "Interpretation output aligned with ACMG evidence",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700"
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-950" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-md space-y-6">
            <div className="space-y-4">
              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-1 text-xs uppercase tracking-[0.26em] text-slate-600">
                {badge}
              </div>
              <div className="space-y-3">
                <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
                  {title}
                </h2>
                <p className="text-sm leading-6 text-slate-600">{description}</p>
              </div>
            </div>
            {children}
            {footer ? <div className="text-sm text-slate-600">{footer}</div> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
