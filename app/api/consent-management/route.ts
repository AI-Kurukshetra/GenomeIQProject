import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("consents")
    .select(
      "id, patient_id, consent_scope, status, granted_at, revoked_at, expires_at, document_path, created_at",
    )
    .order("created_at", { ascending: false });

  if (patientId) {
    query = query.eq("patient_id", patientId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    consents: data ?? [],
    implemented: true,
  });
}
