import { buildApiPlaceholder } from "@/lib/api/placeholder";

export async function GET() {
  return buildApiPlaceholder("literature", ["PubMed ingestion", "publication insights", "evidence mining"]);
}
