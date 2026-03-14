import { NextResponse } from "next/server";

import { getGeneDiseaseAssociations } from "@/lib/platform-features";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const [{ data: genes, error }, associations] = await Promise.all([
    supabase.from("genes").select("id, symbol, name, summary, created_at").order("symbol"),
    getGeneDiseaseAssociations(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    associations,
    genes: genes ?? [],
    implemented: true,
  });
}
