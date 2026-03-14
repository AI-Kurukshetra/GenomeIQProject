import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getDashboardContext, getDashboardStats } from "@/lib/dashboard";

export const metadata: Metadata = {
  title: "Dashboard | GenomeIQ",
  description: "Operational dashboard for GenomeIQ clinical genomics teams.",
};

const statCards = [
  {
    key: "totalPatients",
    label: "Total Patients",
    accent: "text-cyan-300",
    detail: "Unique patients currently visible inside your org-scoped workspace.",
  },
  {
    key: "samplesProcessed",
    label: "Samples Processed",
    accent: "text-emerald-300",
    detail: "Genomic samples with a completed processing status.",
  },
  {
    key: "variantsFound",
    label: "Variants Found",
    accent: "text-amber-300",
    detail: "Variants linked to the organization through patient and sample access.",
  },
  {
    key: "reportsGenerated",
    label: "Reports Generated",
    accent: "text-fuchsia-300",
    detail: "Clinical reports created for samples in the current tenant.",
  },
] as const;

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function DashboardPage() {
  const [context, stats] = await Promise.all([
    getDashboardContext(),
    getDashboardStats(),
  ]);

  if (!context) {
    redirect("/auth/login");
  }

  const completionRate =
    stats.totalSamples > 0
      ? Math.round((stats.samplesProcessed / stats.totalSamples) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(8,47,73,0.74))] p-8 shadow-[0_30px_80px_rgba(2,6,23,0.28)] transition-all duration-500 hover:shadow-[0_40px_100px_rgba(2,6,23,0.4)] hover:-translate-y-2 slide-up">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3 fade-in">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">
              {context.organizationType}
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              {context.organizationName} overview
            </h1>
            <p className="text-sm leading-6 text-slate-300">
              Real-time operational metrics with secure data access controls. All statistics
              reflect only your organization's data, ensuring privacy and data isolation
              across the platform.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 slide-in-right">
            <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-4 transition-all duration-300 hover:bg-black/30 hover:shadow-2xl hover:scale-105">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Completion Rate
              </p>
              <p className="mt-2 text-3xl font-semibold text-white">{completionRate}%</p>
              <p className="mt-1 text-sm text-slate-400">
                {formatCount(stats.samplesProcessed)} of {formatCount(stats.totalSamples)} samples
                completed
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 px-5 py-4">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Signed In Role
              </p>
              <p className="mt-2 text-3xl font-semibold capitalize text-white">
                {context.role}
              </p>
              <p className="mt-1 text-sm text-slate-400">{context.user.email}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card, index) => {
          const value = stats[card.key];

          return (
            <article
              key={card.key}
              className="rounded-[28px] border border-white/10 bg-slate-950/60 p-6 backdrop-blur transition-all duration-400 hover:bg-slate-950/70 hover:shadow-2xl hover:-translate-y-3 hover:scale-105 cursor-pointer scale-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {card.label}
              </p>
              <p className={`mt-4 text-4xl font-semibold ${card.accent}`}>
                {formatCount(value)}
              </p>
              <p className="mt-3 text-sm leading-6 text-slate-400">{card.detail}</p>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-7 transition-all duration-400 hover:bg-white/8 hover:shadow-2xl hover:-translate-y-2 slide-in-left">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Pipeline Snapshot
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 transition-all duration-300 hover:bg-black/30 hover:shadow-lg hover:scale-105">
              <p className="text-sm text-slate-400">Patient registry</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatCount(stats.totalPatients)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 transition-all duration-300 hover:bg-black/30 hover:shadow-lg hover:scale-105">
              <p className="text-sm text-slate-400">Sample throughput</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatCount(stats.samplesProcessed)}
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-5 transition-all duration-300 hover:bg-black/30 hover:shadow-lg hover:scale-105">
              <p className="text-sm text-slate-400">Interpretation volume</p>
              <p className="mt-2 text-2xl font-semibold text-white">
                {formatCount(stats.variantsFound)}
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[32px] border border-dashed border-cyan-400/30 bg-cyan-400/[0.06] p-7 transition-all duration-400 hover:bg-cyan-400/10 hover:shadow-2xl hover:-translate-y-2 hover:border-cyan-400/50 slide-in-right">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Reporting
          </p>
          <p className="mt-4 text-3xl font-semibold text-white">
            {formatCount(stats.reportsGenerated)}
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Clinical reports generated for samples in your workspace. Updates
            automatically as new reports are finalized.
          </p>
        </article>
      </section>
    </div>
  );
}
