import { NextResponse } from "next/server";

import { getQualityMetrics } from "@/lib/samples";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sampleId = searchParams.get("sampleId") ?? undefined;
    const metrics = await getQualityMetrics(sampleId);

    return NextResponse.json({
      implemented: true,
      metrics,
      sampleId: sampleId ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch quality metrics." },
      { status: 500 },
    );
  }
}
