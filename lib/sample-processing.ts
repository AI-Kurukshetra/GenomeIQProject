import type { AnnotationSource, Json, VariantClassification } from "@/types";

export interface ParsedAnnotation {
  data: Json;
  source: AnnotationSource;
}

export interface ParsedVariant {
  acmgCriteria: string[];
  altAllele: string;
  annotations: ParsedAnnotation[];
  chromosome: string;
  classification: VariantClassification;
  consequence: string | null;
  gene: string;
  hgvsC: string | null;
  hgvsP: string | null;
  position: number;
  refAllele: string;
  sourceData: Json;
  transcript: string | null;
  zygosity: string;
}

export interface ParsedVcfSummary {
  filteredVariantCount: number;
  headerLineCount: number;
  totalVariantLines: number;
  variants: ParsedVariant[];
}

function parseInfoField(info: string) {
  return info.split(";").reduce<Record<string, string | true>>((accumulator, item) => {
    if (!item) {
      return accumulator;
    }

    const [key, ...rest] = item.split("=");

    if (!key) {
      return accumulator;
    }

    accumulator[key.toUpperCase()] = rest.length > 0 ? rest.join("=") : true;
    return accumulator;
  }, {});
}

function getStringValue(
  info: Record<string, string | true>,
  ...keys: string[]
) {
  for (const key of keys) {
    const value = info[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function inferClassification(info: Record<string, string | true>, qual: string, filter: string) {
  const clinSig = getStringValue(info, "CLNSIG", "CLIN_SIG", "SIGNIFICANCE")?.toLowerCase() ?? "";
  const impact = getStringValue(info, "IMPACT", "ANN_IMPACT")?.toLowerCase() ?? "";
  const quality = Number.parseFloat(qual);

  if (clinSig.includes("pathogenic") && !clinSig.includes("likely")) {
    return "pathogenic" satisfies VariantClassification;
  }

  if (clinSig.includes("likely_pathogenic") || clinSig.includes("likely pathogenic")) {
    return "likely_pathogenic" satisfies VariantClassification;
  }

  if (clinSig.includes("benign") && !clinSig.includes("likely")) {
    return "benign" satisfies VariantClassification;
  }

  if (clinSig.includes("likely_benign") || clinSig.includes("likely benign")) {
    return "likely_benign" satisfies VariantClassification;
  }

  if (impact.includes("high")) {
    return "likely_pathogenic" satisfies VariantClassification;
  }

  if (filter === "PASS" && Number.isFinite(quality) && quality >= 150) {
    return "likely_pathogenic" satisfies VariantClassification;
  }

  return "uncertain" satisfies VariantClassification;
}

function inferZygosity(format: string | undefined, sampleValue: string | undefined) {
  const formatKeys = (format ?? "").split(":");
  const sampleValues = (sampleValue ?? "").split(":");
  const genotypeIndex = formatKeys.findIndex((key) => key === "GT");
  const genotype =
    genotypeIndex >= 0 ? sampleValues[genotypeIndex] ?? sampleValue ?? "" : sampleValue ?? "";

  if (genotype.includes("1/1") || genotype.includes("1|1")) {
    return "homozygous";
  }

  if (
    genotype.includes("0/1") ||
    genotype.includes("1/0") ||
    genotype.includes("0|1") ||
    genotype.includes("1|0")
  ) {
    return "heterozygous";
  }

  if (genotype.includes("1/2") || genotype.includes("1|2") || genotype.includes("2|1")) {
    return "compound_heterozygous";
  }

  if (genotype === "1" || genotype === "1|." || genotype === "1/.") {
    return "hemizygous";
  }

  return "heterozygous";
}

function deriveGene(info: Record<string, string | true>) {
  const directGene = getStringValue(info, "GENE", "GENEINFO", "SYMBOL");

  if (directGene) {
    return directGene.split(/[|,:]/)[0]?.trim().toUpperCase() || "UNKNOWN";
  }

  const ann = getStringValue(info, "ANN");

  if (ann) {
    const annotation = ann.split(",")[0]?.split("|") ?? [];
    const geneName = annotation[3] || annotation[4];

    if (geneName?.trim()) {
      return geneName.trim().toUpperCase();
    }
  }

  return "UNKNOWN";
}

function buildAnnotations(info: Record<string, string | true>) {
  const annotations: ParsedAnnotation[] = [];
  const clinSig = getStringValue(info, "CLNSIG", "CLIN_SIG");
  const omim = getStringValue(info, "OMIM");
  const population = getStringValue(info, "AF", "GNOMAD_AF");

  if (clinSig) {
    annotations.push({
      data: {
        clinical_significance: clinSig,
        ingested_from_vcf: true,
      },
      source: "clinvar",
    });
  }

  if (omim) {
    annotations.push({
      data: {
        ingested_from_vcf: true,
        omim: omim,
      },
      source: "omim",
    });
  }

  if (population) {
    annotations.push({
      data: {
        allele_frequency: population,
        ingested_from_vcf: true,
      },
      source: "gnomad",
    });
  }

  return annotations;
}

export function parseVcfContent(content: string, maxVariants = 250): ParsedVcfSummary {
  const lines = content.split(/\r?\n/);
  const variants: ParsedVariant[] = [];
  let headerLineCount = 0;
  let totalVariantLines = 0;
  let filteredVariantCount = 0;

  for (const line of lines) {
    if (!line.trim()) {
      continue;
    }

    if (line.startsWith("#")) {
      headerLineCount += 1;
      continue;
    }

    totalVariantLines += 1;

    if (variants.length >= maxVariants) {
      filteredVariantCount += 1;
      continue;
    }

    const columns = line.split("\t");

    if (columns.length < 8) {
      filteredVariantCount += 1;
      continue;
    }

    const [chromosome, position, , refAllele, altAllele, qual, filter, infoField, format, sample] =
      columns;
    const parsedPosition = Number.parseInt(position, 10);

    if (!chromosome || !Number.isInteger(parsedPosition) || !refAllele || !altAllele) {
      filteredVariantCount += 1;
      continue;
    }

    const info = parseInfoField(infoField ?? "");
    const gene = deriveGene(info);
    const annotations = buildAnnotations(info);
    const hgvsC = getStringValue(info, "HGVSC");
    const hgvsP = getStringValue(info, "HGVSP");
    const transcript = getStringValue(info, "FEATURE", "TRANSCRIPT");
    const consequence = getStringValue(info, "CONSEQUENCE", "CSQ");

    variants.push({
      acmgCriteria: getStringValue(info, "ACMG", "ACMG_CRITERIA")
        ?.split(",")
        .map((criterion) => criterion.trim().toUpperCase())
        .filter(Boolean) ?? [],
      altAllele,
      annotations,
      chromosome: chromosome.replace(/^chr/i, ""),
      classification: inferClassification(info, qual ?? "", filter ?? ""),
      consequence,
      gene,
      hgvsC,
      hgvsP,
      position: parsedPosition,
      refAllele,
      sourceData: {
        filter: filter ?? null,
        info,
        quality: qual ?? null,
      },
      transcript,
      zygosity: inferZygosity(format, sample),
    });
  }

  return {
    filteredVariantCount,
    headerLineCount,
    totalVariantLines,
    variants,
  };
}
