import { buildApiPlaceholder } from "@/lib/api/placeholder";

export async function GET() {
  return buildApiPlaceholder("workflows", ["workflow definitions", "workflow runs", "batch orchestration"]);
}
