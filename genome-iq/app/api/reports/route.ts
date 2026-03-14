import { NextResponse } from "next/server";

import { getReportComments, getReportsList, getReportVersions } from "@/lib/reports";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const reportId = searchParams.get("reportId");
    const reports = await getReportsList();
    const filteredReports = reportId ? reports.filter((report) => report.id === reportId) : reports;
    const versions = await getReportVersions(reportId ?? undefined);
    const comments = await getReportComments(reportId ?? undefined);

    return NextResponse.json({
      comments,
      implemented: true,
      reports: filteredReports,
      versions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch reports." },
      { status: 500 },
    );
  }
}
