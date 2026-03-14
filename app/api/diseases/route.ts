import { NextResponse } from "next/server";

import { getGeneDiseaseAssociations } from "@/lib/platform-features";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const [{ data: diseases, error }, associations] = await Promise.all([
    supabase
      .from("diseases")
      .select("id, name, category, description, created_at")
      .order("name"),
    getGeneDiseaseAssociations(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    diseases: diseases ?? [],
    gene_disease_associations: associations,
    implemented: true,
  });
}
