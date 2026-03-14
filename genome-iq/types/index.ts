export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "clinician" | "researcher" | "admin";
export type SampleStatus = "uploaded" | "processing" | "completed" | "failed";
export type VariantClassification =
  | "pathogenic"
  | "likely_pathogenic"
  | "uncertain"
  | "likely_benign"
  | "benign";
export type ReportStatus = "draft" | "finalized";
export type AnnotationSource = "clinvar" | "omim" | "gnomad";
export type ConsentStatus = "granted" | "revoked" | "expired";
export type AnalysisStatus = "queued" | "processing" | "completed" | "failed";
export type OmicsModality =
  | "genomics"
  | "transcriptomics"
  | "proteomics"
  | "epigenomics";

export interface Organization {
  id: string;
  name: string;
  type: string;
  created_at: string;
}

export interface OrganizationInsert {
  id?: string;
  name: string;
  type: string;
  created_at?: string;
}

export interface OrganizationUpdate {
  id?: string;
  name?: string;
  type?: string;
  created_at?: string;
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  organization_id: string | null;
  created_at: string;
}

export interface UserInsert {
  id: string;
  email: string;
  role?: UserRole;
  organization_id?: string | null;
  created_at?: string;
}

export interface UserUpdate {
  id?: string;
  email?: string;
  role?: UserRole;
  organization_id?: string | null;
  created_at?: string;
}

export interface Patient {
  id: string;
  org_id: string;
  name: string;
  external_id: string;
  date_of_birth: string | null;
  gender: string | null;
  phenotypes: Json;
  created_at: string;
}

export interface PatientInsert {
  id?: string;
  org_id: string;
  name: string;
  external_id: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phenotypes?: Json;
  created_at?: string;
}

export interface PatientUpdate {
  id?: string;
  org_id?: string;
  name?: string;
  external_id?: string;
  date_of_birth?: string | null;
  gender?: string | null;
  phenotypes?: Json;
  created_at?: string;
}

export interface GenomicSample {
  id: string;
  patient_id: string;
  sample_type: string;
  file_path: string;
  file_name: string;
  status: SampleStatus;
  processing_started_at: string | null;
  processing_completed_at: string | null;
  parser_version: string | null;
  file_size_bytes: number | null;
  created_at: string;
}

export interface GenomicSampleInsert {
  id?: string;
  patient_id: string;
  sample_type: string;
  file_path: string;
  file_name: string;
  status?: SampleStatus;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  parser_version?: string | null;
  file_size_bytes?: number | null;
  created_at?: string;
}

export interface GenomicSampleUpdate {
  id?: string;
  patient_id?: string;
  sample_type?: string;
  file_path?: string;
  file_name?: string;
  status?: SampleStatus;
  processing_started_at?: string | null;
  processing_completed_at?: string | null;
  parser_version?: string | null;
  file_size_bytes?: number | null;
  created_at?: string;
}

export interface Variant {
  id: string;
  sample_id: string;
  gene_id: string | null;
  gene: string;
  chromosome: string;
  position: number;
  ref_allele: string;
  alt_allele: string;
  zygosity: string;
  classification: VariantClassification;
  transcript: string | null;
  hgvs_c: string | null;
  hgvs_p: string | null;
  consequence: string | null;
  acmg_criteria: Json;
  source_data: Json;
  created_at: string;
}

export interface VariantInsert {
  id?: string;
  sample_id: string;
  gene_id?: string | null;
  gene: string;
  chromosome: string;
  position: number;
  ref_allele: string;
  alt_allele: string;
  zygosity: string;
  classification?: VariantClassification;
  transcript?: string | null;
  hgvs_c?: string | null;
  hgvs_p?: string | null;
  consequence?: string | null;
  acmg_criteria?: Json;
  source_data?: Json;
  created_at?: string;
}

export interface VariantUpdate {
  id?: string;
  sample_id?: string;
  gene_id?: string | null;
  gene?: string;
  chromosome?: string;
  position?: number;
  ref_allele?: string;
  alt_allele?: string;
  zygosity?: string;
  classification?: VariantClassification;
  transcript?: string | null;
  hgvs_c?: string | null;
  hgvs_p?: string | null;
  consequence?: string | null;
  acmg_criteria?: Json;
  source_data?: Json;
  created_at?: string;
}

export interface ClinicalReport {
  id: string;
  sample_id: string;
  created_by: string | null;
  status: ReportStatus;
  content: Json;
  created_at: string;
}

export interface ClinicalReportInsert {
  id?: string;
  sample_id: string;
  created_by?: string | null;
  status?: ReportStatus;
  content?: Json;
  created_at?: string;
}

export interface ClinicalReportUpdate {
  id?: string;
  sample_id?: string;
  created_by?: string | null;
  status?: ReportStatus;
  content?: Json;
  created_at?: string;
}

export interface Annotation {
  id: string;
  variant_id: string;
  source: AnnotationSource;
  data: Json;
  created_at: string;
}

export interface AnnotationInsert {
  id?: string;
  variant_id: string;
  source: AnnotationSource;
  data?: Json;
  created_at?: string;
}

export interface AnnotationUpdate {
  id?: string;
  variant_id?: string;
  source?: AnnotationSource;
  data?: Json;
  created_at?: string;
}

export interface Gene {
  id: string;
  symbol: string;
  name: string;
  summary: string | null;
  metadata: Json;
  created_at: string;
}

export interface GeneInsert {
  id?: string;
  symbol: string;
  name: string;
  summary?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface GeneUpdate {
  id?: string;
  symbol?: string;
  name?: string;
  summary?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface Disease {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  metadata: Json;
  created_at: string;
}

export interface DiseaseInsert {
  id?: string;
  name: string;
  category?: string | null;
  description?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface DiseaseUpdate {
  id?: string;
  name?: string;
  category?: string | null;
  description?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface GeneDiseaseAssociation {
  id: string;
  gene_id: string;
  disease_id: string;
  evidence_level: string | null;
  source: string | null;
  confidence: number | null;
  metadata: Json;
  created_at: string;
}

export interface GeneDiseaseAssociationInsert {
  id?: string;
  gene_id: string;
  disease_id: string;
  evidence_level?: string | null;
  source?: string | null;
  confidence?: number | null;
  metadata?: Json;
  created_at?: string;
}

export interface GeneDiseaseAssociationUpdate {
  id?: string;
  gene_id?: string;
  disease_id?: string;
  evidence_level?: string | null;
  source?: string | null;
  confidence?: number | null;
  metadata?: Json;
  created_at?: string;
}

export interface PhenotypeTerm {
  id: string;
  label: string;
  hpo_id: string | null;
  category: string | null;
  description: string | null;
  metadata: Json;
  created_at: string;
}

export interface PhenotypeTermInsert {
  id?: string;
  label: string;
  hpo_id?: string | null;
  category?: string | null;
  description?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface PhenotypeTermUpdate {
  id?: string;
  label?: string;
  hpo_id?: string | null;
  category?: string | null;
  description?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface VariantDiseaseAssociation {
  id: string;
  variant_id: string;
  disease_id: string;
  evidence_level: string | null;
  therapeutic_relevance: string | null;
  metadata: Json;
  created_at: string;
}

export interface VariantDiseaseAssociationInsert {
  id?: string;
  variant_id: string;
  disease_id: string;
  evidence_level?: string | null;
  therapeutic_relevance?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface VariantDiseaseAssociationUpdate {
  id?: string;
  variant_id?: string;
  disease_id?: string;
  evidence_level?: string | null;
  therapeutic_relevance?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface Consent {
  id: string;
  organization_id: string;
  patient_id: string;
  status: ConsentStatus;
  consent_scope: string;
  granted_at: string;
  revoked_at: string | null;
  expires_at: string | null;
  document_path: string | null;
  metadata: Json;
  created_at: string;
}

export interface ConsentInsert {
  id?: string;
  organization_id: string;
  patient_id: string;
  status?: ConsentStatus;
  consent_scope: string;
  granted_at?: string;
  revoked_at?: string | null;
  expires_at?: string | null;
  document_path?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface ConsentUpdate {
  id?: string;
  organization_id?: string;
  patient_id?: string;
  status?: ConsentStatus;
  consent_scope?: string;
  granted_at?: string;
  revoked_at?: string | null;
  expires_at?: string | null;
  document_path?: string | null;
  metadata?: Json;
  created_at?: string;
}

export interface OmicsDataset {
  id: string;
  organization_id: string;
  patient_id: string | null;
  sample_id: string | null;
  modality: OmicsModality;
  file_path: string;
  file_name: string;
  status: AnalysisStatus;
  summary: Json;
  created_at: string;
}

export interface OmicsDatasetInsert {
  id?: string;
  organization_id: string;
  patient_id?: string | null;
  sample_id?: string | null;
  modality: OmicsModality;
  file_path: string;
  file_name: string;
  status?: AnalysisStatus;
  summary?: Json;
  created_at?: string;
}

export interface OmicsDatasetUpdate {
  id?: string;
  organization_id?: string;
  patient_id?: string | null;
  sample_id?: string | null;
  modality?: OmicsModality;
  file_path?: string;
  file_name?: string;
  status?: AnalysisStatus;
  summary?: Json;
  created_at?: string;
}

export interface CollaborationComment {
  id: string;
  organization_id: string;
  patient_id: string | null;
  sample_id: string | null;
  report_id: string | null;
  author_id: string | null;
  body: string;
  created_at: string;
}

export interface CollaborationCommentInsert {
  id?: string;
  organization_id: string;
  patient_id?: string | null;
  sample_id?: string | null;
  report_id?: string | null;
  author_id?: string | null;
  body: string;
  created_at?: string;
}

export interface CollaborationCommentUpdate {
  id?: string;
  organization_id?: string;
  patient_id?: string | null;
  sample_id?: string | null;
  report_id?: string | null;
  author_id?: string | null;
  body?: string;
  created_at?: string;
}

export interface IntegrationEndpoint {
  id: string;
  organization_id: string;
  name: string;
  provider: string;
  endpoint_url: string;
  auth_config: Json;
  status: string;
  last_sync_at: string | null;
  created_at: string;
}

export interface IntegrationEndpointInsert {
  id?: string;
  organization_id: string;
  name: string;
  provider: string;
  endpoint_url: string;
  auth_config?: Json;
  status?: string;
  last_sync_at?: string | null;
  created_at?: string;
}

export interface IntegrationEndpointUpdate {
  id?: string;
  organization_id?: string;
  name?: string;
  provider?: string;
  endpoint_url?: string;
  auth_config?: Json;
  status?: string;
  last_sync_at?: string | null;
  created_at?: string;
}

export interface QualityMetric {
  id: string;
  organization_id: string;
  sample_id: string;
  metric_type: string;
  metric_value: string | null;
  numeric_value: number | null;
  status: string | null;
  details: Json;
  created_at: string;
}

export interface QualityMetricInsert {
  id?: string;
  organization_id: string;
  sample_id: string;
  metric_type: string;
  metric_value?: string | null;
  numeric_value?: number | null;
  status?: string | null;
  details?: Json;
  created_at?: string;
}

export interface QualityMetricUpdate {
  id?: string;
  organization_id?: string;
  sample_id?: string;
  metric_type?: string;
  metric_value?: string | null;
  numeric_value?: number | null;
  status?: string | null;
  details?: Json;
  created_at?: string;
}

export interface ReportVersion {
  id: string;
  organization_id: string;
  report_id: string;
  version_number: number;
  content: Json;
  change_summary: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ReportVersionInsert {
  id?: string;
  organization_id: string;
  report_id: string;
  version_number: number;
  content?: Json;
  change_summary?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface ReportVersionUpdate {
  id?: string;
  organization_id?: string;
  report_id?: string;
  version_number?: number;
  content?: Json;
  change_summary?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export interface IntegrationSyncEvent {
  id: string;
  organization_id: string;
  endpoint_id: string;
  sync_type: string;
  status: string;
  payload_summary: Json;
  created_at: string;
}

export interface IntegrationSyncEventInsert {
  id?: string;
  organization_id: string;
  endpoint_id: string;
  sync_type?: string;
  status?: string;
  payload_summary?: Json;
  created_at?: string;
}

export interface IntegrationSyncEventUpdate {
  id?: string;
  organization_id?: string;
  endpoint_id?: string;
  sync_type?: string;
  status?: string;
  payload_summary?: Json;
  created_at?: string;
}

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization & Record<string, unknown>;
        Insert: OrganizationInsert & Record<string, unknown>;
        Update: OrganizationUpdate & Record<string, unknown>;
        Relationships: [];
      };
      users: {
        Row: User & Record<string, unknown>;
        Insert: UserInsert & Record<string, unknown>;
        Update: UserUpdate & Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: "users_organization_id_fkey";
            columns: ["organization_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      patients: {
        Row: Patient & Record<string, unknown>;
        Insert: PatientInsert & Record<string, unknown>;
        Update: PatientUpdate & Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: "patients_org_id_fkey";
            columns: ["org_id"];
            isOneToOne: false;
            referencedRelation: "organizations";
            referencedColumns: ["id"];
          },
        ];
      };
      genomic_samples: {
        Row: GenomicSample & Record<string, unknown>;
        Insert: GenomicSampleInsert & Record<string, unknown>;
        Update: GenomicSampleUpdate & Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: "genomic_samples_patient_id_fkey";
            columns: ["patient_id"];
            isOneToOne: false;
            referencedRelation: "patients";
            referencedColumns: ["id"];
          },
        ];
      };
      variants: {
        Row: Variant & Record<string, unknown>;
        Insert: VariantInsert & Record<string, unknown>;
        Update: VariantUpdate & Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: "variants_sample_id_fkey";
            columns: ["sample_id"];
            isOneToOne: false;
            referencedRelation: "genomic_samples";
            referencedColumns: ["id"];
          },
        ];
      };
      clinical_reports: {
        Row: ClinicalReport & Record<string, unknown>;
        Insert: ClinicalReportInsert & Record<string, unknown>;
        Update: ClinicalReportUpdate & Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: "clinical_reports_sample_id_fkey";
            columns: ["sample_id"];
            isOneToOne: false;
            referencedRelation: "genomic_samples";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clinical_reports_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      annotations: {
        Row: Annotation & Record<string, unknown>;
        Insert: AnnotationInsert & Record<string, unknown>;
        Update: AnnotationUpdate & Record<string, unknown>;
        Relationships: [
          {
            foreignKeyName: "annotations_variant_id_fkey";
            columns: ["variant_id"];
            isOneToOne: false;
            referencedRelation: "variants";
            referencedColumns: ["id"];
          },
        ];
      };
      genes: {
        Row: Gene & Record<string, unknown>;
        Insert: GeneInsert & Record<string, unknown>;
        Update: GeneUpdate & Record<string, unknown>;
        Relationships: [];
      };
      diseases: {
        Row: Disease & Record<string, unknown>;
        Insert: DiseaseInsert & Record<string, unknown>;
        Update: DiseaseUpdate & Record<string, unknown>;
        Relationships: [];
      };
      gene_disease_associations: {
        Row: GeneDiseaseAssociation & Record<string, unknown>;
        Insert: GeneDiseaseAssociationInsert & Record<string, unknown>;
        Update: GeneDiseaseAssociationUpdate & Record<string, unknown>;
        Relationships: [];
      };
      phenotype_terms: {
        Row: PhenotypeTerm & Record<string, unknown>;
        Insert: PhenotypeTermInsert & Record<string, unknown>;
        Update: PhenotypeTermUpdate & Record<string, unknown>;
        Relationships: [];
      };
      variant_disease_associations: {
        Row: VariantDiseaseAssociation & Record<string, unknown>;
        Insert: VariantDiseaseAssociationInsert & Record<string, unknown>;
        Update: VariantDiseaseAssociationUpdate & Record<string, unknown>;
        Relationships: [];
      };
      consents: {
        Row: Consent & Record<string, unknown>;
        Insert: ConsentInsert & Record<string, unknown>;
        Update: ConsentUpdate & Record<string, unknown>;
        Relationships: [];
      };
      omics_datasets: {
        Row: OmicsDataset & Record<string, unknown>;
        Insert: OmicsDatasetInsert & Record<string, unknown>;
        Update: OmicsDatasetUpdate & Record<string, unknown>;
        Relationships: [];
      };
      collaboration_comments: {
        Row: CollaborationComment & Record<string, unknown>;
        Insert: CollaborationCommentInsert & Record<string, unknown>;
        Update: CollaborationCommentUpdate & Record<string, unknown>;
        Relationships: [];
      };
      integration_endpoints: {
        Row: IntegrationEndpoint & Record<string, unknown>;
        Insert: IntegrationEndpointInsert & Record<string, unknown>;
        Update: IntegrationEndpointUpdate & Record<string, unknown>;
        Relationships: [];
      };
      quality_metrics: {
        Row: QualityMetric & Record<string, unknown>;
        Insert: QualityMetricInsert & Record<string, unknown>;
        Update: QualityMetricUpdate & Record<string, unknown>;
        Relationships: [];
      };
      report_versions: {
        Row: ReportVersion & Record<string, unknown>;
        Insert: ReportVersionInsert & Record<string, unknown>;
        Update: ReportVersionUpdate & Record<string, unknown>;
        Relationships: [];
      };
      integration_sync_events: {
        Row: IntegrationSyncEvent & Record<string, unknown>;
        Insert: IntegrationSyncEventInsert & Record<string, unknown>;
        Update: IntegrationSyncEventUpdate & Record<string, unknown>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_org_id: {
        Args: Record<string, never>;
        Returns: string | null;
      };
    };
    Enums: {
      user_role: UserRole;
      sample_status: SampleStatus;
      variant_classification: VariantClassification;
      report_status: ReportStatus;
      annotation_source: AnnotationSource;
      consent_status: ConsentStatus;
      analysis_status: AnalysisStatus;
      omics_modality: OmicsModality;
    };
    CompositeTypes: Record<string, never>;
  };
};
