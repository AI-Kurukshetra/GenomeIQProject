import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("collaboration_comments")
    .select("id, patient_id, sample_id, report_id, author_id, body, created_at")
    .order("created_at", { ascending: false });

  if (patientId) {
    query = query.eq("patient_id", patientId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    comments: data ?? [],
    implemented: true,
  });
}
