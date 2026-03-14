import { buildApiPlaceholder } from "@/lib/api/placeholder";

export async function GET() {
  return buildApiPlaceholder("pharmacogenomics", ["drug response", "gene-drug interactions"]);
}
