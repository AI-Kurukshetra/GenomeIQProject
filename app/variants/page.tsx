import Link from "next/link";
import type { Metadata } from "next";

import { createVariantAction } from "@/app/variants/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SubmitButton } from "@/components/ui/submit-button";
import { getDashboardStats } from "@/lib/dashboard";
import { formatDate, getPatientsList } from "@/lib/patients";
import {
  getGeneDiseaseAssociations,
  getVariantDiseaseAssociations,
} from "@/lib/platform-features";
import { getSamplesList } from "@/lib/samples";
import {
  formatVariantLocus,
  getVariantClassificationClasses,
  getVariantsList,
} from "@/lib/variants";
import type { VariantListItem } from "@/lib/variants";

export const metadata: Metadata = {
  title: "Variants | GenomeIQ",
  description: "Variant review and interpretation workspace for GenomeIQ.",
};

interface VariantsPageProps {
  searchParams?: Promise<{
    classification?: string;
    error?: string;
    q?: string;
    success?: string;
  }>;
}

const classificationOptions = [
  { label: "All classifications", value: "" },
  { label: "Pathogenic", value: "pathogenic" },
  { label: "Likely pathogenic", value: "likely_pathogenic" },
  { label: "Uncertain significance", value: "uncertain" },
  { label: "Likely benign", value: "likely_benign" },
  { label: "Benign", value: "benign" },
] as const;

const formClassificationOptions = classificationOptions.filter((option) => option.value);
const zygosityOptions = [
  "heterozygous",
  "homozygous",
  "hemizygous",
  "compound_heterozygous",
] as const;
const annotationSourceOptions = [
  { label: "ClinVar", value: "clinvar" },
  { label: "OMIM", value: "omim" },
  { label: "gnomAD", value: "gnomad" },
] as const;

function matchesFilters(
  searchTerm: string,
  classificationFilter: string,
  variant: VariantListItem,
) {
  const haystack = [
    variant.gene,
    variant.patientName,
    variant.patientExternalId,
    variant.sampleFileName,
    variant.chromosome,
    variant.zygosity,
    variant.annotationSources.join(" "),
    variant.phenotypes.join(" "),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchesSearch = !searchTerm || haystack.includes(searchTerm);
  const matchesClassification =
    !classificationFilter || variant.classification === classificationFilter;

  return matchesSearch && matchesClassification;
}

function buildPreviewPanels(leadVariant: VariantListItem | undefined, phenotypeHint: string) {
  return [
    {
      detail: leadVariant
        ? `${leadVariant.gene} is ready for downstream interpretation using live stored variant data from sample ${leadVariant.sampleFileName ?? leadVariant.sampleId}.`
        : "Create a variant below and the interpretation workbench will immediately reflect that stored data.",
      eyebrow: "Interpretation Engine",
      tone: "border-amber-500/25 bg-amber-500/10 text-amber-100",
      title: "Clinical interpretation surface",
    },
    {
      detail: leadVariant
        ? `Literature mining can now anchor on ${leadVariant.gene}, ${formatVariantLocus(leadVariant)}, and phenotype hints like ${phenotypeHint}.`
        : "After saving variants, this panel becomes the launch point for evidence retrieval and paper summaries.",
      eyebrow: "Literature Mining",
      tone: "border-fuchsia-500/25 bg-fuchsia-500/10 text-fuchsia-100",
      title: "Evidence watchlist",
    },
    {
      detail: phenotypeHint
        ? `Phenotype matching can score stored variants against patient findings such as ${phenotypeHint}.`
        : "Add phenotype-rich patients and stored variants to make AI prioritization meaningful here.",
      eyebrow: "AI Phenotype Match",
      tone: "border-cyan-500/25 bg-cyan-500/10 text-cyan-100",
      title: "Phenotype-driven prioritization",
    },
    {
      detail: leadVariant
        ? `Stored ${leadVariant.gene} findings can now flow into drug-response review and treatment relevance logic.`
        : "Pharmacogenomics logic can attach to the stored variant set once drug-gene rules are implemented.",
      eyebrow: "Pharmacogenomics",
      tone: "border-emerald-500/25 bg-emerald-500/10 text-emerald-100",
      title: "Therapeutic impact preview",
    },
  ];
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export default async function VariantsPage({ searchParams }: VariantsPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const searchTerm = (params?.q ?? "").trim().toLowerCase();
  const classificationFilter = (params?.classification ?? "").trim().toLowerCase();
  const [variants, stats, patients, samples, knowledgeLinks, variantDiseaseLinks] = await Promise.all([
    getVariantsList(),
    getDashboardStats(),
    getPatientsList(),
    getSamplesList(),
    getGeneDiseaseAssociations(),
    getVariantDiseaseAssociations(),
  ]);
  const filteredVariants = variants.filter((variant) =>
    matchesFilters(searchTerm, classificationFilter, variant),
  );
  const clinicallySignificant = variants.filter(
    (variant) =>
      variant.classification === "pathogenic" ||
      variant.classification === "likely_pathogenic",
  ).length;
  const annotatedVariants = variants.filter(
    (variant) => variant.annotationSources.length > 0,
  ).length;
  const patientsCovered = new Set(
    variants.map((variant) => variant.patientId).filter(Boolean),
  ).size;
  const geneCounts = new Map<string, number>();
  const variantCountsBySample = new Map<string, number>();

  for (const variant of variants) {
    geneCounts.set(variant.gene, (geneCounts.get(variant.gene) ?? 0) + 1);
    variantCountsBySample.set(
      variant.sampleId,
      (variantCountsBySample.get(variant.sampleId) ?? 0) + 1,
    );
  }

  const topGenes = Array.from(geneCounts.entries())
    .map(([gene, count]) => ({ count, gene }))
    .sort((left, right) => right.count - left.count)
    .slice(0, 5);
  const phenotypeHint =
    patients.flatMap((patient) =>
      Array.isArray(patient.phenotypes)
        ? patient.phenotypes.filter((item): item is string => typeof item === "string")
        : [],
    )[0] ?? "captured HPO phenotype terms";
  const leadVariant = filteredVariants[0] ?? variants[0];
  const previewPanels = buildPreviewPanels(leadVariant, phenotypeHint);
  const relevantKnowledgeLinks = knowledgeLinks.filter((association) =>
    topGenes.some((gene) => gene.gene === association.geneSymbol),
  );
  const relevantVariantDiseaseLinks = variantDiseaseLinks.filter((association) =>
    filteredVariants.some((variant) => variant.id === association.variantId),
  );

  return (
    <div className="space-y-6">
      {params?.success ? (
        <Alert variant="success">
          <AlertTitle>Variant saved</AlertTitle>
          <AlertDescription>{params.success}</AlertDescription>
        </Alert>
      ) : null}
      {params?.error ? (
        <Alert variant="destructive">
          <AlertTitle>Variant could not be saved</AlertTitle>
          <AlertDescription>{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.82),rgba(76,29,149,0.22))] p-7">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-cyan-300">
              Variant Analysis Workspace
            </p>
            <h1 className="text-3xl font-semibold text-white sm:text-4xl">
              Stored variant records, annotations, and interpretation launch points.
            </h1>
            <p className="text-sm leading-6 text-slate-300">
              This module now supports real variant capture into Supabase. Save a variant
              below and it will immediately appear in the review table, patient summary,
              dashboard counts, and analytics views.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl bg-[var(--primary)] px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300"
              href="/samples/upload"
            >
              Upload sample
            </Link>
            <Link
              className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              href="/reports"
            >
              Generate reports
            </Link>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Live variants</p>
            <p className="mt-2 text-3xl font-semibold text-white">
              {formatCount(stats.variantsFound)}
            </p>
            <p className="mt-2 text-sm text-slate-400">Rows currently stored in `variants`.</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Clinically significant
            </p>
            <p className="mt-2 text-3xl font-semibold text-amber-300">
              {formatCount(clinicallySignificant)}
            </p>
            <p className="mt-2 text-sm text-slate-400">Pathogenic or likely pathogenic.</p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Annotated</p>
            <p className="mt-2 text-3xl font-semibold text-fuchsia-300">
              {formatCount(annotatedVariants)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Variants already carrying annotation source rows.
            </p>
          </article>
          <article className="rounded-3xl border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Patients covered</p>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">
              {formatCount(patientsCovered)}
            </p>
            <p className="mt-2 text-sm text-slate-400">
              Patients currently linked to stored variant calls.
            </p>
          </article>
        </div>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <div className="max-w-3xl space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
            Variant Capture
          </p>
          <h2 className="text-3xl font-semibold text-white">Save a variant into Supabase</h2>
          <p className="text-sm leading-6 text-slate-400">
            This form creates a real `variants` row and optional `annotations` rows. The
            selected sample will be marked `completed` so dashboard and analytics counts
            update from actual stored data.
          </p>
        </div>

        {samples.length === 0 ? (
          <Alert className="mt-6" variant="destructive">
            <AlertTitle>No samples available</AlertTitle>
            <AlertDescription>
              Upload at least one sample before creating variant records.
            </AlertDescription>
          </Alert>
        ) : (
          <form action={createVariantAction} className="mt-6 space-y-6">
            <div className="grid gap-5 xl:grid-cols-2">
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="sampleId">Sample</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="sampleId"
                  name="sampleId"
                  required
                >
                  <option value="">Select sample</option>
                  {samples.map((sample) => (
                    <option key={sample.id} value={sample.id}>
                      {sample.file_name} | {sample.patient?.name ?? "Unknown patient"} |{" "}
                      {sample.patient?.external_id ?? "unlinked"} | existing variants:{" "}
                      {variantCountsBySample.get(sample.id) ?? 0}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gene">Gene</Label>
                <Input id="gene" name="gene" placeholder="BRCA1" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="chromosome">Chromosome</Label>
                <Input id="chromosome" name="chromosome" placeholder="17" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="position">Position</Label>
                <Input id="position" min="1" name="position" placeholder="43045700" required type="number" />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="refAllele">Reference Allele</Label>
                  <Input id="refAllele" name="refAllele" placeholder="A" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="altAllele">Alternate Allele</Label>
                  <Input id="altAllele" name="altAllele" placeholder="G" required />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="zygosity">Zygosity</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="zygosity"
                  name="zygosity"
                  required
                >
                  <option value="">Select zygosity</option>
                  {zygosityOptions.map((option) => (
                    <option key={option} value={option}>
                      {option.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="classification">Classification</Label>
                <select
                  className="h-11 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                  id="classification"
                  name="classification"
                  required
                >
                  <option value="">Select classification</option>
                  {formClassificationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
              <div className="space-y-2">
                <Label htmlFor="acmgCriteria">ACMG Criteria</Label>
                <Input
                  id="acmgCriteria"
                  name="acmgCriteria"
                  placeholder="PVS1, PS4, PM2"
                />
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Annotation Sources</Label>
                  <p className="mt-1 text-sm text-slate-400">
                    Selected sources will be written as `annotations` rows for this variant.
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  {annotationSourceOptions.map((source) => (
                    <label
                      key={source.value}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate-200"
                    >
                      <input
                        className="h-4 w-4 rounded border-white/20 bg-slate-950/60 text-cyan-300"
                        name="annotationSources"
                        type="checkbox"
                        value={source.value}
                      />
                      <span>{source.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="annotationNote">Annotation Note</Label>
              <textarea
                className="min-h-28 w-full rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
                id="annotationNote"
                name="annotationNote"
                placeholder="Short interpretation note or annotation context"
              />
            </div>

            <SubmitButton className="w-full sm:w-auto" pendingLabel="Saving variant...">
              Save Variant
            </SubmitButton>
          </form>
        )}
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <div className="max-w-3xl space-y-2">
          <p className="font-mono text-xs uppercase tracking-[0.28em] text-cyan-300">
            Variant Inbox
          </p>
          <h2 className="text-3xl font-semibold text-white">Search and filter variants</h2>
          <p className="text-sm leading-6 text-slate-400">
            This table reflects live Supabase data only. Every row here is persisted and can
            feed patient summaries, reports, and analytics.
          </p>
        </div>

        <form className="mt-6 grid gap-4 sm:grid-cols-1 md:grid-cols-[minmax(0,1fr)_260px_auto]">
          <Input
            defaultValue={params?.q ?? ""}
            name="q"
            placeholder="Search by gene, patient, phenotype, or sample"
          />
          <select
            className="h-11 rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]/60"
            defaultValue={params?.classification ?? ""}
            name="classification"
          >
            {classificationOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            type="submit"
          >
            Apply Filters
          </button>
        </form>
      </section>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-slate-950/60">
        <div className="grid gap-4 p-4 md:hidden">
          {filteredVariants.length > 0 ? (
            filteredVariants.map((variant) => (
              <article
                key={variant.id}
                className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-[0_14px_32px_rgba(148,163,184,0.12)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{variant.gene}</p>
                    <p className="mt-1 text-sm text-slate-600">{formatVariantLocus(variant)}</p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                      {variant.zygosity}
                    </p>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${getVariantClassificationClasses(
                      variant.classification,
                    )}`}
                  >
                    {variant.classification.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Patient</p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {variant.patientName ?? "Patient unavailable"}
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-sky-700">
                      {variant.patientExternalId ?? "unlinked"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Sample</p>
                    <p className="mt-2 font-semibold text-slate-950">
                      {variant.sampleFileName ?? "Unknown sample"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {variant.sampleStatus ?? "status unavailable"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {variant.annotationSources.length > 0 ? (
                    variant.annotationSources.map((source) => (
                      <span
                        key={`${variant.id}-${source}`}
                        className="rounded-full border border-fuchsia-200 bg-fuchsia-50 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-700"
                      >
                        {source}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">No annotations yet</span>
                  )}
                </div>

                {variant.phenotypes.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {variant.phenotypes.slice(0, 2).map((phenotype) => (
                      <span
                        key={`${variant.id}-${phenotype}`}
                        className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] text-sky-700"
                      >
                        {phenotype}
                      </span>
                    ))}
                  </div>
                ) : null}

                <p className="mt-4 text-sm text-slate-600">{formatDate(variant.created_at)}</p>
              </article>
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-slate-300 bg-white px-4 py-10 text-center text-sm text-slate-500">
              No live variants match the current filters yet.
            </div>
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full divide-y divide-white/10 text-left">
            <thead className="bg-white/[0.03]">
              <tr className="text-xs uppercase tracking-[0.22em] text-slate-500">
                <th className="px-6 py-4 font-medium">Gene / Locus</th>
                <th className="px-6 py-4 font-medium">Patient</th>
                <th className="px-6 py-4 font-medium">Sample</th>
                <th className="px-6 py-4 font-medium">Classification</th>
                <th className="px-6 py-4 font-medium">Annotations</th>
                <th className="px-6 py-4 font-medium">Captured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/8">
              {filteredVariants.length > 0 ? (
                filteredVariants.map((variant) => (
                  <tr key={variant.id} className="align-top text-sm text-slate-200">
                    <td className="px-6 py-5">
                      <p className="font-semibold text-white">{variant.gene}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatVariantLocus(variant)}</p>
                      <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">
                        {variant.zygosity}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      {variant.patientId ? (
                        <div>
                          <p className="font-medium text-white">{variant.patientName}</p>
                          <p className="mt-1 font-mono text-xs uppercase tracking-[0.18em] text-cyan-300">
                            {variant.patientExternalId}
                          </p>
                          <div className="mt-2 flex max-w-sm flex-wrap gap-2">
                            {variant.phenotypes.slice(0, 2).map((phenotype) => (
                              <span
                                key={`${variant.id}-${phenotype}`}
                                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2.5 py-1 text-[11px] text-cyan-100"
                              >
                                {phenotype}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-500">Patient unavailable</span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <p className="font-medium text-white">{variant.sampleFileName ?? "Unknown sample"}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                        {variant.sampleStatus ?? "status unavailable"}
                      </p>
                    </td>
                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${getVariantClassificationClasses(
                          variant.classification,
                        )}`}
                      >
                        {variant.classification.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-wrap gap-2">
                        {variant.annotationSources.length > 0 ? (
                          variant.annotationSources.map((source) => (
                            <span
                              key={`${variant.id}-${source}`}
                              className="rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-fuchsia-100"
                            >
                              {source}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500">No annotations yet</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-slate-300">{formatDate(variant.created_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-6 py-16 text-center text-sm text-slate-400" colSpan={6}>
                    No live variants match the current filters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Gene Spotlight
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">Top genes in the current inbox</h2>
          <div className="mt-5 space-y-3">
            {topGenes.length > 0 ? (
              topGenes.map((gene) => (
                <div
                  key={gene.gene}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                >
                  <div>
                    <p className="font-semibold text-white">{gene.gene}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                      Variant count
                    </p>
                  </div>
                  <p className="text-2xl font-semibold text-cyan-300">{gene.count}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                Save at least one variant to populate gene-level burden and hotspot summaries.
              </div>
            )}
          </div>
        </article>

        <article className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
            Downstream Modules
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-white">
            Interpretation and AI launch surfaces
          </h2>
          <div className="mt-5 grid gap-3">
            {previewPanels.map((panel) => (
              <div
                key={panel.eyebrow}
                className="rounded-2xl border border-white/10 bg-black/20 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-slate-500">
                      {panel.eyebrow}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold text-white">{panel.title}</h3>
                  </div>
                  <span
                    className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${panel.tone}`}
                  >
                    Ready surface
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-300">{panel.detail}</p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-[32px] border border-white/10 bg-white/5 p-6">
        <p className="font-mono text-xs uppercase tracking-[0.26em] text-cyan-300">
          Disease-Gene Association Database
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Curated and variant-linked knowledge for the current inbox
        </h2>
        <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_1fr]">
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Curated gene-disease links</p>
            {relevantKnowledgeLinks.length > 0 ? (
              relevantKnowledgeLinks.slice(0, 6).map((association) => (
                <div
                  key={association.id}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-semibold text-white">
                    {association.geneSymbol} {"->"} {association.diseaseName}
                  </p>
                  <p className="mt-2 text-sm text-slate-400">{association.geneName}</p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {association.evidenceLevel ? <span>{association.evidenceLevel}</span> : null}
                    {association.source ? <span>{association.source}</span> : null}
                    {association.confidence !== null ? <span>{association.confidence}%</span> : null}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                No curated disease-gene associations match the genes in the current variant
                inbox yet. Add them from the settings page.
              </div>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Auto-linked variant disease rows</p>
            {relevantVariantDiseaseLinks.length > 0 ? (
              relevantVariantDiseaseLinks.slice(0, 6).map((association) => (
                <div
                  key={`${association.variantId}-${association.diseaseName}`}
                  className="rounded-2xl border border-white/10 bg-black/20 p-4"
                >
                  <p className="font-semibold text-white">
                    {association.geneSymbol} {"->"} {association.diseaseName}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                    {association.evidenceLevel ? <span>{association.evidenceLevel}</span> : null}
                    {association.therapeuticRelevance ? (
                      <span>{association.therapeuticRelevance}</span>
                    ) : null}
                    <span>{formatDate(association.created_at)}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 p-4 text-sm leading-6 text-slate-400">
                Process a sample or curate associations to populate variant-level disease links.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
