import { buildApiPlaceholder } from "@/lib/api/placeholder";

export async function GET() {
  return buildApiPlaceholder("population-genetics", ["allele frequencies", "population comparison", "ancestry"]);
}
