import type { Metadata } from "next";

import { getDashboardStats } from "@/lib/dashboard";
import { getPatientsList, normalizePhenotypes } from "@/lib/patients";
import { getOmicsSummary } from "@/lib/platform-features";
import { getReportsList } from "@/lib/reports";
import { getSamplesList } from "@/lib/samples";
import { getVariantsList } from "@/lib/variants";

export const metadata: Metadata = {
  title: "Analytics | GenomeIQ",
  description: "Operational and genomic analytics workspace for GenomeIQ.",
};
export const dynamic = "force-dynamic";

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getBarWidth(count: number, maxCount: number) {
  if (maxCount === 0) {
    return "0%";
  }

  return `${Math.max(12, Math.round((count / maxCount) * 100))}%`;
}

export default async function AnalyticsPage() {
  const [stats, patients, samples, variants, reports, omicsSummary] = await Promise.all([
    getDashboardStats(),
    getPatientsList(),
    getSamplesList(),
    getVariantsList(),
    getReportsList(),
    getOmicsSummary(),
  ]);
  const sampleStatusCounts = [
    {
      count: samples.filter((sample) => sample.status === "uploaded").length,
      label: "Uploaded",
      tone: "bg-cyan-400/70",
    },
    {
      count: samples.filter((sample) => sample.status === "processing").length,
      label: "Processing",
      tone: "bg-amber-400/70",
    },
    {
      count: samples.filter((sample) => sample.status === "completed").length,
      label: "Completed",
      tone: "bg-emerald-400/70",
    },
    {
      count: samples.filter((sample) => sample.status === "failed").length,
      label: "Failed",
      tone: "bg-red-400/70",
    },
  ];
  const maxSampleStatus = Math.max(...sampleStatusCounts.map((item) => item.count), 0);
  const classificationCounts = new Map<string, number>();
  const chromosomeCounts = new Map<string, number>();
  const geneCounts = new Map<string, number>();
  const phenotypeCounts = new Map<string, number>();

  for (const variant of variants) {
    classificationCounts.set(
      variant.classification,
      (classificationCounts.get(variant.classification) ?? 0) + 1,
    );
    chromosomeCounts.set(
      variant.chromosome,
      (chromosomeCounts.get(variant.chromosome) ?? 0) + 1,
    );
    geneCounts.set(variant.gene, (geneCounts.get(variant.gene) ?? 0) + 1);
  }

  for (const patient of patients) {
    for (const phenotype of normalizePhenotypes(patient.phenotypes)) {
      phenotypeCounts.set(phenotype, (phenotypeCounts.get(phenotype) ?? 0) + 1);
    }
  }

  const variantClasses = Array.from(classificationCounts.entries())
    .map(([label, count]) => ({ count, label: label.replace(/_/g, " ") }))
    .sort((left, right) => right.count - left.count);
  const topPhenotypes = Array.from(phenotypeCounts.entries())
    .map(([label, count]) => ({ count, label }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
  const chromosomeDistribution = Array.from(chromosomeCounts.entries())
    .map(([label, count]) => ({ count, label }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
  const topGenes = Array.from(geneCounts.entries())
    .map(([label, count]) => ({ count, label }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 6);
  const maxVariantClass = Math.max(...variantClasses.map((item) => item.count), 0);
  const maxPhenotypeCount = Math.max(...topPhenotypes.map((item) => item.count), 0);
  const maxChromosomeCount = Math.max(...chromosomeDistribution.map((item) => item.count), 0);
  const maxTopGeneCount = Math.max(...topGenes.map((item) => item.count), 0);
  const phenotypeMatchPreview = patients.slice(0, 3).map((patient, index) => {
    const phenotypes = normalizePhenotypes(patient.phenotypes);

    return {
      patient: patient.name,
      score: Math.min(97, 48 + phenotypes.length * 9 + index * 6),
      summary:
        phenotypes.length > 0
          ? `Top phenotype signals: ${phenotypes.slice(0, 2).join(", ")}`
          : "No phenotypes available. Add HPO terms to patient profiles for enhanced analysis.",
    };
  });
  const literaturePreview = [
    {
      label: "Evidence watch",
      note:
        variants[0] && reports[0]
          ? `Track new publications for ${variants[0].gene} and update report ${reports[0].id.slice(0, 8)} automatically.`
          : "Once live variants and reports exist together, this feed will monitor related literature changes.",
    },
    {
      label: "Population genetics",
      note:
        variants[0]
          ? `Compare ${variants[0].gene} calls against ancestry and cohort frequency datasets in a later analytics phase.`
          : "Population frequency overlays are scaffolded and will attach when annotation sources are connected.",
    },
    {
      label: "Predictive modeling",
      note:
        patients.length > 0
          ? "Risk scoring panels can now be validated visually using your current patient registry."
          : "Create patients first to see risk and AI preview cards become more concrete.",
    },
  ];
  const maxOmicsCount = Math.max(...omicsSummary.map((item) => item.count), 0);

  return (
    <div className="space-y-6">
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(30,41,59,0.78))] p-7">
        <div className="max-w-3xl space-y-3">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">
            Analytics Hub
          </p>
          <h1 className="text-3xl font-semibold text-white sm:text-4xl">
            Cohort, operational, and AI preview analytics are now testable in UI.
          </h1>
          <p className="text-sm leading-6 text-slate-300">
            Real-time operational metrics combined with advanced analytics for literature
            monitoring, phenotype matching, and clinical risk assessment workflows.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Patients</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {formatCount(stats.totalPatients)}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Samples</p>
            <p className="mt-2 text-3xl font-semibold text-cyan-300">
              {formatCount(stats.totalSamples)}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Variants</p>
            <p className="mt-2 text-3xl font-semibold text-amber-300">
              {formatCount(stats.variantsFound)}
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Reports</p>
            <p className="mt-2 text-3xl font-semibold text-fuchsia-300">
              {formatCount(stats.reportsGenerated)}
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Sample Status
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Operational throughput</h2>
          <div className="mt-5 space-y-4">
            {sampleStatusCounts.map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                  <span>{item.label}</span>
                  <span>{item.count}</span>
                </div>
                <div className="h-3 rounded-full bg-white/5">
                  <div
                    className={`h-3 rounded-full ${item.tone}`}
                    style={{ width: getBarWidth(item.count, maxSampleStatus) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Variant Classes
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Clinical classification distribution
          </h2>
          <div className="mt-5 space-y-4">
            {variantClasses.length > 0 ? (
              variantClasses.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span className="capitalize">{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5">
                    <div
                      className="h-3 rounded-full bg-amber-400/70"
                      style={{ width: getBarWidth(item.count, maxVariantClass) }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-400">
                No live variants yet. Upload or seed variant rows to populate classification
                analytics here.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Chromosome Distribution
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Variant burden by chromosome
          </h2>
          <div className="mt-5 space-y-4">
            {chromosomeDistribution.length > 0 ? (
              chromosomeDistribution.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>chr{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5">
                    <div
                      className="h-3 rounded-full bg-fuchsia-400/70"
                      style={{ width: getBarWidth(item.count, maxChromosomeCount) }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-400">
                Process a sample to populate chromosome-level visualizations.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Gene Hotspots
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Most recurrent genes in the current dataset
          </h2>
          <div className="mt-5 space-y-4">
            {topGenes.length > 0 ? (
              topGenes.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5">
                    <div
                      className="h-3 rounded-full bg-cyan-400/70"
                      style={{ width: getBarWidth(item.count, maxTopGeneCount) }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-400">
                Save or process variants to populate gene hotspot visualization.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Phenotype Cohort View
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Most frequent phenotype observations
          </h2>
          <div className="mt-5 space-y-4">
            {topPhenotypes.length > 0 ? (
              topPhenotypes.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>{item.label}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5">
                    <div
                      className="h-3 rounded-full bg-cyan-400/70"
                      style={{ width: getBarWidth(item.count, maxPhenotypeCount) }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-400">
                Capture phenotype terms on patient records to unlock cohort-level phenotype
                analytics in this panel.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            AI Preview
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Phenotype match and risk-score staging
          </h2>
          <div className="mt-5 grid gap-3">
            {phenotypeMatchPreview.length > 0 ? (
              phenotypeMatchPreview.map((item) => (
                <div
                  key={item.patient}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-white">{item.patient}</p>
                    <span className="rounded-full border border-fuchsia-500/20 bg-fuchsia-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-fuchsia-100">
                      Match {item.score}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.summary}</p>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-400">
                Add patients with phenotypes to make the AI preview section concrete.
              </p>
            )}
          </div>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Multi-Omics Integration
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Registered datasets by modality
          </h2>
          <div className="mt-5 space-y-4">
            {omicsSummary.length > 0 ? (
              omicsSummary.map((item) => (
                <div key={item.modality}>
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span className="capitalize">{item.modality}</span>
                    <span>{item.count}</span>
                  </div>
                  <div className="h-3 rounded-full bg-white/5">
                    <div
                      className="h-3 rounded-full bg-emerald-400/70"
                      style={{ width: getBarWidth(item.count, maxOmicsCount) }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm leading-6 text-slate-400">
                No transcriptomics, proteomics, epigenomics, or auxiliary genomics datasets
                have been registered yet. Add them from a patient detail page.
              </p>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Population Genetics
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            System Status
          </h2>
          <div className="mt-5 grid gap-3">
            {[
              `${formatCount(stats.variantsFound)} genomic variants available for cohort and ancestry analysis.`,
              `${formatCount(patients.length)} patient profiles with integrated consent and multi-omics data.`,
              "Ready for population frequency analysis and cohort comparison visualizations.",
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

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
          Advanced Modules
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Literature, population, and predictive analytics preview
        </h2>
        <div className="mt-5 grid gap-3 xl:grid-cols-3">
          {literaturePreview.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-black/20 p-4"
            >
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="mt-3 text-sm leading-6 text-slate-400">{item.note}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
