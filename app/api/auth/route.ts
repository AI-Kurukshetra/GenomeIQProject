import { buildApiPlaceholder } from "@/lib/api/placeholder";

export async function GET() {
  return buildApiPlaceholder("auth", ["Supabase Auth bridge", "session introspection"]);
}
