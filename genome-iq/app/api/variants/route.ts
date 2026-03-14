import { NextResponse } from "next/server";

import {
  getGeneDiseaseAssociations,
  getVariantDiseaseAssociations,
} from "@/lib/platform-features";
import { getVariantsList } from "@/lib/variants";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sampleId = searchParams.get("sampleId");
    const patientId = searchParams.get("patientId");
    const classification = searchParams.get("classification");
    let variants = await getVariantsList();

    if (sampleId) {
      variants = variants.filter((variant) => variant.sampleId === sampleId);
    }

    if (patientId) {
      variants = variants.filter((variant) => variant.patientId === patientId);
    }

    if (classification) {
      variants = variants.filter((variant) => variant.classification === classification);
    }

    const [geneDiseaseAssociations, variantDiseaseAssociations] = await Promise.all([
      getGeneDiseaseAssociations(),
      getVariantDiseaseAssociations(),
    ]);

    return NextResponse.json({
      gene_disease_associations: geneDiseaseAssociations,
      implemented: true,
      variant_disease_associations: variantDiseaseAssociations,
      variants,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch variants." },
      { status: 500 },
    );
  }
}
