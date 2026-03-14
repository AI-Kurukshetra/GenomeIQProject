"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getDashboardContext } from "@/lib/dashboard";
import { buildDataExportBundle } from "@/lib/export";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/types";

function buildSettingsRedirect(type: "error" | "success", message: string) {
  return `/settings?${type}=${encodeURIComponent(message)}`;
}

export async function createGeneDiseaseAssociationAction(formData: FormData) {
  const geneSymbol = String(formData.get("geneSymbol") ?? "").trim().toUpperCase();
  const geneName = String(formData.get("geneName") ?? "").trim();
  const diseaseName = String(formData.get("diseaseName") ?? "").trim();
  const diseaseCategory = String(formData.get("diseaseCategory") ?? "").trim();
  const evidenceLevel = String(formData.get("evidenceLevel") ?? "").trim();
  const source = String(formData.get("source") ?? "").trim();
  const confidenceRaw = String(formData.get("confidence") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();

  if (!geneSymbol || !geneName || !diseaseName) {
    redirect(
      buildSettingsRedirect(
        "error",
        "Gene symbol, gene name, and disease name are required.",
      ),
    );
  }

  const confidence = confidenceRaw ? Number.parseFloat(confidenceRaw) : null;
  const supabase = await createSupabaseServerClient();

  const { data: gene, error: geneError } = await supabase
    .from("genes")
    .upsert(
      {
        metadata: summary ? ({ summary } as Json) : ({} as Json),
        name: geneName,
        symbol: geneSymbol,
        summary: summary || null,
      },
      { onConflict: "symbol" },
    )
    .select("id")
    .single();

  if (geneError) {
    redirect(buildSettingsRedirect("error", geneError.message));
  }

  const { data: disease, error: diseaseError } = await supabase
    .from("diseases")
    .upsert(
      {
        category: diseaseCategory || null,
        description: summary || null,
        metadata: summary ? ({ summary } as Json) : ({} as Json),
        name: diseaseName,
      },
      { onConflict: "name" },
    )
    .select("id")
    .single();

  if (diseaseError) {
    redirect(buildSettingsRedirect("error", diseaseError.message));
  }

  const { error: associationError } = await supabase.from("gene_disease_associations").insert({
    confidence,
    disease_id: disease.id,
    evidence_level: evidenceLevel || null,
    gene_id: gene.id,
    metadata: {} as Json,
    source: source || null,
  });

  if (associationError) {
    redirect(buildSettingsRedirect("error", associationError.message));
  }

  revalidatePath("/settings");
  revalidatePath("/variants");
  redirect(buildSettingsRedirect("success", "Disease-gene association saved."));
}

export async function createIntegrationEndpointAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildSettingsRedirect("error", "Your organization context is not ready yet."));
  }

  const name = String(formData.get("name") ?? "").trim();
  const provider = String(formData.get("provider") ?? "").trim();
  const endpointUrl = String(formData.get("endpointUrl") ?? "").trim();
  const authType = String(formData.get("authType") ?? "").trim();
  const status = String(formData.get("status") ?? "active").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name || !provider || !endpointUrl) {
    redirect(
      buildSettingsRedirect(
        "error",
        "Integration name, provider, and endpoint URL are required.",
      ),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("integration_endpoints").insert({
    auth_config: {
      auth_type: authType || "api_key",
      notes: notes || null,
    } as Json,
    endpoint_url: endpointUrl,
    name,
    organization_id: context.organizationId,
    provider,
    status,
  });

  if (error) {
    redirect(buildSettingsRedirect("error", error.message));
  }

  revalidatePath("/settings");
  redirect(buildSettingsRedirect("success", "Integration endpoint saved."));
}

export async function triggerIntegrationSyncAction(formData: FormData) {
  const context = await getDashboardContext();

  if (!context?.organizationId) {
    redirect(buildSettingsRedirect("error", "Your organization context is not ready yet."));
  }

  const endpointId = String(formData.get("endpointId") ?? "").trim();

  if (!endpointId) {
    redirect(buildSettingsRedirect("error", "Choose an integration endpoint first."));
  }

  const supabase = await createSupabaseServerClient();
  const { data: endpoint, error: endpointError } = await supabase
    .from("integration_endpoints")
    .select("id, name")
    .eq("id", endpointId)
    .maybeSingle();

  if (endpointError) {
    redirect(buildSettingsRedirect("error", endpointError.message));
  }

  if (!endpoint) {
    redirect(buildSettingsRedirect("error", "The selected integration is not accessible."));
  }

  const exportBundle = await buildDataExportBundle();
  const syncTime = new Date().toISOString();

  const { error: syncEventError } = await supabase.from("integration_sync_events").insert({
    endpoint_id: endpointId,
    organization_id: context.organizationId,
    payload_summary: {
      endpoint_name: endpoint.name,
      exported_at: exportBundle.exported_at,
      summary: exportBundle.summary,
    } as Json,
    status: "completed",
    sync_type: "manual_export",
  });

  if (syncEventError) {
    redirect(buildSettingsRedirect("error", syncEventError.message));
  }

  const { error: updateError } = await supabase
    .from("integration_endpoints")
    .update({ last_sync_at: syncTime })
    .eq("id", endpointId);

  if (updateError) {
    redirect(buildSettingsRedirect("error", updateError.message));
  }

  revalidatePath("/settings");
  redirect(buildSettingsRedirect("success", `Integration sync completed for ${endpoint.name}.`));
}
