import { NextResponse } from "next/server";

import { buildDataExportBundle } from "@/lib/export";

export async function GET() {
  try {
    const bundle = await buildDataExportBundle();

    return NextResponse.json({
      implemented: true,
      ...bundle,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to build export bundle." },
      { status: 500 },
    );
  }
}
