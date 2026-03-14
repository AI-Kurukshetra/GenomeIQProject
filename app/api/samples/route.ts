import { NextResponse } from "next/server";

import { getSamplesList } from "@/lib/samples";

export async function GET() {
  try {
    const samples = await getSamplesList();

    return NextResponse.json({
      implemented: true,
      samples,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch samples." },
      { status: 500 },
    );
  }
}
