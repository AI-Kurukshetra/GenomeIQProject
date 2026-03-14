import { buildApiPlaceholder } from "@/lib/api/placeholder";

export async function GET() {
  return buildApiPlaceholder("users", ["user directory", "role management", "audit metadata"]);
}
