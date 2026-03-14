-- GenomeIQ platform blueprint entities

create extension if not exists "pgcrypto";

DO $$
BEGIN
  CREATE TYPE public.consent_status AS ENUM ('granted', 'revoked', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.analysis_status AS ENUM ('queued', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.workflow_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.job_status AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.omics_modality AS ENUM ('genomics', 'transcriptomics', 'proteomics', 'epigenomics');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.genes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  hgnc_id text UNIQUE,
  ensembl_id text UNIQUE,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mondo_id text UNIQUE,
  omim_id text UNIQUE,
  category text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phenotype_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  hpo_id text UNIQUE,
  category text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.variants
ADD COLUMN IF NOT EXISTS gene_id uuid REFERENCES public.genes(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS transcript text,
ADD COLUMN IF NOT EXISTS hgvs_c text,
ADD COLUMN IF NOT EXISTS hgvs_p text,
ADD COLUMN IF NOT EXISTS consequence text,
ADD COLUMN IF NOT EXISTS source_data jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.genomic_samples
ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS omics_modality public.omics_modality NOT NULL DEFAULT 'genomics',
ADD COLUMN IF NOT EXISTS checksum text,
ADD COLUMN IF NOT EXISTS file_size_bytes bigint,
ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS parser_version text;

UPDATE public.genomic_samples gs
SET organization_id = p.org_id
FROM public.patients p
WHERE p.id = gs.patient_id
  AND gs.organization_id IS NULL;

CREATE TABLE IF NOT EXISTS public.patient_phenotype_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  phenotype_term_id uuid NOT NULL REFERENCES public.phenotype_terms(id) ON DELETE CASCADE,
  observed_at timestamptz,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gene_disease_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gene_id uuid NOT NULL REFERENCES public.genes(id) ON DELETE CASCADE,
  disease_id uuid NOT NULL REFERENCES public.diseases(id) ON DELETE CASCADE,
  evidence_level text,
  source text,
  confidence numeric(5,2),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.variant_disease_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.variants(id) ON DELETE CASCADE,
  disease_id uuid NOT NULL REFERENCES public.diseases(id) ON DELETE CASCADE,
  evidence_level text,
  therapeutic_relevance text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  source text,
  description text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.gene_pathways (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gene_id uuid NOT NULL REFERENCES public.genes(id) ON DELETE CASCADE,
  pathway_id uuid NOT NULL REFERENCES public.pathways(id) ON DELETE CASCADE,
  role text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.drug_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gene_id uuid REFERENCES public.genes(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.variants(id) ON DELETE SET NULL,
  disease_id uuid REFERENCES public.diseases(id) ON DELETE SET NULL,
  drug_name text NOT NULL,
  response_type text,
  recommendation text,
  source text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pubmed_id text UNIQUE,
  title text NOT NULL,
  journal text,
  published_on date,
  abstract text,
  source_url text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.publication_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id uuid NOT NULL REFERENCES public.publications(id) ON DELETE CASCADE,
  entity_type text,
  entity_id text,
  summary text NOT NULL,
  extracted_claims jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence numeric(5,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.population_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gene_id uuid REFERENCES public.genes(id) ON DELETE SET NULL,
  variant_id uuid REFERENCES public.variants(id) ON DELETE CASCADE,
  population_code text NOT NULL,
  source text NOT NULL,
  allele_frequency numeric(12,8),
  sample_size integer,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.protein_structures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gene_id uuid REFERENCES public.genes(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.variants(id) ON DELETE CASCADE,
  pdb_id text,
  structure_url text,
  impact_summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  status public.consent_status NOT NULL DEFAULT 'granted',
  consent_scope text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  expires_at timestamptz,
  document_path text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.quality_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  sample_id uuid NOT NULL REFERENCES public.genomic_samples(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value text,
  numeric_value numeric(14,4),
  status text,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.analysis_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  sample_id uuid REFERENCES public.genomic_samples(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.variants(id) ON DELETE CASCADE,
  analysis_type text NOT NULL,
  status public.analysis_status NOT NULL DEFAULT 'queued',
  summary text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  recommendations jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.phenotype_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  variant_id uuid REFERENCES public.variants(id) ON DELETE CASCADE,
  gene_id uuid REFERENCES public.genes(id) ON DELETE SET NULL,
  match_score numeric(6,3) NOT NULL,
  reasoning jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.risk_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  score_type text NOT NULL,
  score_value numeric(12,4) NOT NULL,
  risk_band text,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  model_version text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.omics_datasets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  sample_id uuid REFERENCES public.genomic_samples(id) ON DELETE CASCADE,
  modality public.omics_modality NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  status public.analysis_status NOT NULL DEFAULT 'queued',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status public.workflow_status NOT NULL DEFAULT 'draft',
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  published_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workflow_version_unique UNIQUE (workflow_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.batch_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  job_type text NOT NULL,
  status public.job_status NOT NULL DEFAULT 'queued',
  input_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  output_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  sample_id uuid REFERENCES public.genomic_samples(id) ON DELETE SET NULL,
  batch_job_id uuid REFERENCES public.batch_jobs(id) ON DELETE SET NULL,
  status public.job_status NOT NULL DEFAULT 'queued',
  logs jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.report_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  report_id uuid NOT NULL REFERENCES public.clinical_reports(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  change_summary text,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_version_unique UNIQUE (report_id, version_number)
);

CREATE TABLE IF NOT EXISTS public.collaboration_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patients(id) ON DELETE CASCADE,
  sample_id uuid REFERENCES public.genomic_samples(id) ON DELETE CASCADE,
  report_id uuid REFERENCES public.clinical_reports(id) ON DELETE CASCADE,
  author_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  provider text NOT NULL,
  endpoint_url text NOT NULL,
  auth_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'active',
  last_sync_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.genes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phenotype_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gene_disease_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_disease_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gene_pathways ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drug_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publication_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.population_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protein_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_phenotype_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phenotype_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omics_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_endpoints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='genes' AND policyname='genes_select_authenticated') THEN
    CREATE POLICY genes_select_authenticated ON public.genes FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='diseases' AND policyname='diseases_select_authenticated') THEN
    CREATE POLICY diseases_select_authenticated ON public.diseases FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='phenotype_terms' AND policyname='phenotype_terms_select_authenticated') THEN
    CREATE POLICY phenotype_terms_select_authenticated ON public.phenotype_terms FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gene_disease_associations' AND policyname='gene_disease_associations_select_authenticated') THEN
    CREATE POLICY gene_disease_associations_select_authenticated ON public.gene_disease_associations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='variant_disease_associations' AND policyname='variant_disease_associations_select_authenticated') THEN
    CREATE POLICY variant_disease_associations_select_authenticated ON public.variant_disease_associations FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pathways' AND policyname='pathways_select_authenticated') THEN
    CREATE POLICY pathways_select_authenticated ON public.pathways FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='gene_pathways' AND policyname='gene_pathways_select_authenticated') THEN
    CREATE POLICY gene_pathways_select_authenticated ON public.gene_pathways FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='drug_interactions' AND policyname='drug_interactions_select_authenticated') THEN
    CREATE POLICY drug_interactions_select_authenticated ON public.drug_interactions FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='publications' AND policyname='publications_select_authenticated') THEN
    CREATE POLICY publications_select_authenticated ON public.publications FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='publication_insights' AND policyname='publication_insights_select_authenticated') THEN
    CREATE POLICY publication_insights_select_authenticated ON public.publication_insights FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='population_data' AND policyname='population_data_select_authenticated') THEN
    CREATE POLICY population_data_select_authenticated ON public.population_data FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='protein_structures' AND policyname='protein_structures_select_authenticated') THEN
    CREATE POLICY protein_structures_select_authenticated ON public.protein_structures FOR SELECT TO authenticated USING (true);
  END IF;
END $$;

DO $$
DECLARE
  org_tables text[] := ARRAY[
    'patient_phenotype_observations',
    'consents',
    'quality_metrics',
    'analysis_results',
    'phenotype_matches',
    'risk_scores',
    'omics_datasets',
    'workflows',
    'workflow_versions',
    'batch_jobs',
    'workflow_runs',
    'report_versions',
    'collaboration_comments',
    'integration_endpoints'
  ];
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY org_tables LOOP
    EXECUTE format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = ''public''
            AND tablename = %L
            AND policyname = %L
        ) THEN
          EXECUTE %L;
        END IF;
      END
      $inner$;',
      table_name,
      table_name || '_select',
      'CREATE POLICY ' || quote_ident(table_name || '_select') ||
      ' ON public.' || quote_ident(table_name) ||
      ' FOR SELECT USING (organization_id = public.current_org_id())'
    );

    EXECUTE format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = ''public''
            AND tablename = %L
            AND policyname = %L
        ) THEN
          EXECUTE %L;
        END IF;
      END
      $inner$;',
      table_name,
      table_name || '_insert',
      'CREATE POLICY ' || quote_ident(table_name || '_insert') ||
      ' ON public.' || quote_ident(table_name) ||
      ' FOR INSERT WITH CHECK (organization_id = public.current_org_id())'
    );

    EXECUTE format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = ''public''
            AND tablename = %L
            AND policyname = %L
        ) THEN
          EXECUTE %L;
        END IF;
      END
      $inner$;',
      table_name,
      table_name || '_update',
      'CREATE POLICY ' || quote_ident(table_name || '_update') ||
      ' ON public.' || quote_ident(table_name) ||
      ' FOR UPDATE USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id())'
    );

    EXECUTE format('
      DO $inner$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies
          WHERE schemaname = ''public''
            AND tablename = %L
            AND policyname = %L
        ) THEN
          EXECUTE %L;
        END IF;
      END
      $inner$;',
      table_name,
      table_name || '_delete',
      'CREATE POLICY ' || quote_ident(table_name || '_delete') ||
      ' ON public.' || quote_ident(table_name) ||
      ' FOR DELETE USING (organization_id = public.current_org_id())'
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS variants_gene_id_idx ON public.variants(gene_id);
CREATE INDEX IF NOT EXISTS genomic_samples_organization_id_idx ON public.genomic_samples(organization_id);
CREATE INDEX IF NOT EXISTS consents_patient_id_idx ON public.consents(patient_id);
CREATE INDEX IF NOT EXISTS analysis_results_sample_id_idx ON public.analysis_results(sample_id);
CREATE INDEX IF NOT EXISTS risk_scores_patient_id_idx ON public.risk_scores(patient_id);
CREATE INDEX IF NOT EXISTS omics_datasets_patient_id_idx ON public.omics_datasets(patient_id);
CREATE INDEX IF NOT EXISTS workflows_org_id_idx ON public.workflows(organization_id);
CREATE INDEX IF NOT EXISTS batch_jobs_org_id_idx ON public.batch_jobs(organization_id);
CREATE INDEX IF NOT EXISTS workflow_runs_workflow_id_idx ON public.workflow_runs(workflow_id);
