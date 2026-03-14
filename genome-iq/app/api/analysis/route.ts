import { buildApiPlaceholder } from "@/lib/api/placeholder";

export async function GET() {
  return buildApiPlaceholder("analysis", ["analysis results", "pipeline outputs", "decision support"]);
}
