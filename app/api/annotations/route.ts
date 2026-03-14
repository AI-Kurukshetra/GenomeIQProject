import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnnotationSource } from "@/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const variantId = searchParams.get("variantId");
    const source = searchParams.get("source");
    const supabase = await createSupabaseServerClient();
    let query = supabase
      .from("annotations")
      .select("id, variant_id, source, data, created_at")
      .order("created_at", { ascending: false });

    if (variantId) {
      query = query.eq("variant_id", variantId);
    }

    if (source) {
      query = query.eq("source", source as AnnotationSource);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      annotations: data ?? [],
      implemented: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch annotations." },
      { status: 500 },
    );
  }
}
