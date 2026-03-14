import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AnalysisStatus, ConsentStatus, Json, OmicsModality } from "@/types";

export interface GeneDiseaseAssociationItem {
  confidence: number | null;
  created_at: string;
  diseaseCategory: string | null;
  diseaseName: string;
  evidenceLevel: string | null;
  geneName: string;
  geneSymbol: string;
  id: string;
  source: string | null;
}

export interface ConsentRecord {
  consentScope: string;
  created_at: string;
  documentPath: string | null;
  expiresAt: string | null;
  id: string;
  metadata: Json;
  revokedAt: string | null;
  status: ConsentStatus;
}

export interface CollaborationCommentRecord {
  authorEmail: string | null;
  body: string;
  created_at: string;
  id: string;
}

export interface OmicsDatasetRecord {
  created_at: string;
  fileName: string;
  filePath: string;
  id: string;
  modality: OmicsModality;
  sampleFileName: string | null;
  sampleId: string | null;
  status: AnalysisStatus;
  summary: Json;
}

export interface IntegrationEndpointRecord {
  created_at: string;
  endpointUrl: string;
  id: string;
  lastSyncAt: string | null;
  name: string;
  provider: string;
  status: string;
}

export interface IntegrationSyncEventRecord {
  created_at: string;
  endpointId: string;
  endpointName: string;
  id: string;
  payloadSummary: Json;
  status: string;
  syncType: string;
}

export interface OmicsSummaryItem {
  count: number;
  modality: OmicsModality;
}

export interface VariantDiseaseAssociationRecord {
  created_at: string;
  diseaseName: string;
  evidenceLevel: string | null;
  geneSymbol: string;
  therapeuticRelevance: string | null;
  variantId: string;
}

export async function getGeneDiseaseAssociations() {
  const supabase = await createSupabaseServerClient();
  const [
    { data: associationsData, error: associationsError },
    { data: genesData, error: genesError },
    { data: diseasesData, error: diseasesError },
  ] = await Promise.all([
    supabase
      .from("gene_disease_associations")
      .select("id, gene_id, disease_id, evidence_level, source, confidence, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("genes").select("id, symbol, name"),
    supabase.from("diseases").select("id, name, category"),
  ]);

  if (associationsError) {
    throw new Error(associationsError.message);
  }

  if (genesError) {
    throw new Error(genesError.message);
  }

  if (diseasesError) {
    throw new Error(diseasesError.message);
  }

  const genesById = new Map(
    (genesData ?? []).map((gene) => [
      gene.id,
      { name: gene.name, symbol: gene.symbol },
    ]),
  );
  const diseasesById = new Map(
    (diseasesData ?? []).map((disease) => [
      disease.id,
      { category: disease.category, name: disease.name },
    ]),
  );

  return (associationsData ?? [])
    .map((association) => {
      const gene = genesById.get(association.gene_id);
      const disease = diseasesById.get(association.disease_id);

      if (!gene || !disease) {
        return null;
      }

      return {
        confidence: association.confidence,
        created_at: association.created_at,
        diseaseCategory: disease.category,
        diseaseName: disease.name,
        evidenceLevel: association.evidence_level,
        geneName: gene.name,
        geneSymbol: gene.symbol,
        id: association.id,
        source: association.source,
      } satisfies GeneDiseaseAssociationItem;
    })
    .filter((item): item is GeneDiseaseAssociationItem => Boolean(item));
}

export async function getIntegrationEndpoints() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("integration_endpoints")
    .select("id, name, provider, endpoint_url, status, last_sync_at, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((endpoint) => ({
    created_at: endpoint.created_at,
    endpointUrl: endpoint.endpoint_url,
    id: endpoint.id,
    lastSyncAt: endpoint.last_sync_at,
    name: endpoint.name,
    provider: endpoint.provider,
    status: endpoint.status,
  })) as IntegrationEndpointRecord[];
}

export async function getIntegrationSyncEvents() {
  const supabase = await createSupabaseServerClient();
  const [eventsResult, endpointsResult] = await Promise.all([
    supabase
      .from("integration_sync_events")
      .select("id, endpoint_id, sync_type, status, payload_summary, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("integration_endpoints").select("id, name"),
  ]);

  if (eventsResult.error) {
    throw new Error(eventsResult.error.message);
  }

  if (endpointsResult.error) {
    throw new Error(endpointsResult.error.message);
  }

  const endpointNames = new Map(
    (endpointsResult.data ?? []).map((endpoint) => [endpoint.id, endpoint.name]),
  );

  return (eventsResult.data ?? []).map((event) => ({
    created_at: event.created_at,
    endpointId: event.endpoint_id,
    endpointName: endpointNames.get(event.endpoint_id) ?? "Unknown endpoint",
    id: event.id,
    payloadSummary: event.payload_summary,
    status: event.status,
    syncType: event.sync_type,
  })) as IntegrationSyncEventRecord[];
}

export async function getPatientFeatureData(patientId: string) {
  const supabase = await createSupabaseServerClient();
  const [
    { data: consentsData, error: consentsError },
    { data: commentsData, error: commentsError },
    { data: omicsData, error: omicsError },
    { data: usersData, error: usersError },
    { data: samplesData, error: samplesError },
  ] = await Promise.all([
    supabase
      .from("consents")
      .select(
        "id, consent_scope, status, granted_at, revoked_at, expires_at, document_path, metadata, created_at",
      )
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("collaboration_comments")
      .select("id, author_id, body, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase
      .from("omics_datasets")
      .select("id, sample_id, modality, file_path, file_name, status, summary, created_at")
      .eq("patient_id", patientId)
      .order("created_at", { ascending: false }),
    supabase.from("users").select("id, email"),
    supabase.from("genomic_samples").select("id, file_name").eq("patient_id", patientId),
  ]);

  if (consentsError) {
    throw new Error(consentsError.message);
  }

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  if (omicsError) {
    throw new Error(omicsError.message);
  }

  if (usersError) {
    throw new Error(usersError.message);
  }

  if (samplesError) {
    throw new Error(samplesError.message);
  }

  const usersById = new Map((usersData ?? []).map((user) => [user.id, user.email]));
  const samplesById = new Map(
    (samplesData ?? []).map((sample) => [sample.id, sample.file_name]),
  );

  return {
    collaboration: (commentsData ?? []).map((comment) => ({
      authorEmail: comment.author_id ? usersById.get(comment.author_id) ?? null : null,
      body: comment.body,
      created_at: comment.created_at,
      id: comment.id,
    })) as CollaborationCommentRecord[],
    consents: (consentsData ?? []).map((consent) => ({
      consentScope: consent.consent_scope,
      created_at: consent.created_at,
      documentPath: consent.document_path,
      expiresAt: consent.expires_at,
      id: consent.id,
      metadata: consent.metadata,
      revokedAt: consent.revoked_at,
      status: consent.status as ConsentStatus,
    })) as ConsentRecord[],
    omicsDatasets: (omicsData ?? []).map((dataset) => ({
      created_at: dataset.created_at,
      fileName: dataset.file_name,
      filePath: dataset.file_path,
      id: dataset.id,
      modality: dataset.modality as OmicsModality,
      sampleFileName: dataset.sample_id ? samplesById.get(dataset.sample_id) ?? null : null,
      sampleId: dataset.sample_id,
      status: dataset.status as AnalysisStatus,
      summary: dataset.summary,
    })) as OmicsDatasetRecord[],
  };
}

export async function getOmicsSummary() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("omics_datasets")
    .select("modality, status");

  if (error) {
    throw new Error(error.message);
  }

  const counts = new Map<OmicsModality, number>();

  for (const dataset of data ?? []) {
    const modality = dataset.modality as OmicsModality;
    counts.set(modality, (counts.get(modality) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([modality, count]) => ({ count, modality }))
    .sort((left, right) => right.count - left.count) as OmicsSummaryItem[];
}

export async function getVariantDiseaseAssociations() {
  const supabase = await createSupabaseServerClient();
  const [variantDiseaseResult, diseaseResult, variantResult] = await Promise.all([
    supabase
      .from("variant_disease_associations")
      .select("variant_id, disease_id, evidence_level, therapeutic_relevance, created_at"),
    supabase.from("diseases").select("id, name"),
    supabase.from("variants").select("id, gene"),
  ]);

  if (variantDiseaseResult.error) {
    throw new Error(variantDiseaseResult.error.message);
  }

  if (diseaseResult.error) {
    throw new Error(diseaseResult.error.message);
  }

  if (variantResult.error) {
    throw new Error(variantResult.error.message);
  }

  const diseasesById = new Map(
    (diseaseResult.data ?? []).map((disease) => [disease.id, disease.name]),
  );
  const variantsById = new Map(
    (variantResult.data ?? []).map((variant) => [variant.id, variant.gene]),
  );

  return (variantDiseaseResult.data ?? [])
    .map((association) => {
      const diseaseName = diseasesById.get(association.disease_id);
      const geneSymbol = variantsById.get(association.variant_id);

      if (!diseaseName || !geneSymbol) {
        return null;
      }

      return {
        created_at: association.created_at,
        diseaseName,
        evidenceLevel: association.evidence_level,
        geneSymbol,
        therapeuticRelevance: association.therapeutic_relevance,
        variantId: association.variant_id,
      } satisfies VariantDiseaseAssociationRecord;
    })
    .filter((item): item is VariantDiseaseAssociationRecord => Boolean(item));
}
