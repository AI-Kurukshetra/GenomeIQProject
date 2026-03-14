BEGIN;

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
ADD COLUMN IF NOT EXISTS processing_started_at timestamptz,
ADD COLUMN IF NOT EXISTS processing_completed_at timestamptz,
ADD COLUMN IF NOT EXISTS parser_version text,
ADD COLUMN IF NOT EXISTS file_size_bytes bigint;

CREATE TABLE IF NOT EXISTS public.variant_disease_associations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.variants(id) ON DELETE CASCADE,
  disease_id uuid NOT NULL REFERENCES public.diseases(id) ON DELETE CASCADE,
  evidence_level text,
  therapeutic_relevance text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT variant_disease_unique UNIQUE (variant_id, disease_id)
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

CREATE TABLE IF NOT EXISTS public.integration_sync_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  endpoint_id uuid NOT NULL REFERENCES public.integration_endpoints(id) ON DELETE CASCADE,
  sync_type text NOT NULL DEFAULT 'manual_export',
  status text NOT NULL DEFAULT 'completed',
  payload_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phenotype_terms_label ON public.phenotype_terms (label);
CREATE INDEX IF NOT EXISTS idx_variants_gene_id ON public.variants (gene_id);
CREATE INDEX IF NOT EXISTS idx_variant_disease_associations_variant_id ON public.variant_disease_associations (variant_id);
CREATE INDEX IF NOT EXISTS idx_variant_disease_associations_disease_id ON public.variant_disease_associations (disease_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_sample_id ON public.quality_metrics (sample_id);
CREATE INDEX IF NOT EXISTS idx_quality_metrics_organization_id ON public.quality_metrics (organization_id);
CREATE INDEX IF NOT EXISTS idx_report_versions_report_id ON public.report_versions (report_id);
CREATE INDEX IF NOT EXISTS idx_report_versions_organization_id ON public.report_versions (organization_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_events_endpoint_id ON public.integration_sync_events (endpoint_id);
CREATE INDEX IF NOT EXISTS idx_integration_sync_events_organization_id ON public.integration_sync_events (organization_id);

ALTER TABLE public.phenotype_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variant_disease_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quality_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_sync_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'phenotype_terms'
      AND policyname = 'phenotype_terms_select_authenticated'
  ) THEN
    CREATE POLICY phenotype_terms_select_authenticated
      ON public.phenotype_terms
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'phenotype_terms'
      AND policyname = 'phenotype_terms_insert_authenticated'
  ) THEN
    CREATE POLICY phenotype_terms_insert_authenticated
      ON public.phenotype_terms
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'variant_disease_associations'
      AND policyname = 'variant_disease_associations_select_authenticated'
  ) THEN
    CREATE POLICY variant_disease_associations_select_authenticated
      ON public.variant_disease_associations
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'variant_disease_associations'
      AND policyname = 'variant_disease_associations_insert_authenticated'
  ) THEN
    CREATE POLICY variant_disease_associations_insert_authenticated
      ON public.variant_disease_associations
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_metrics'
      AND policyname = 'quality_metrics_select_same_org'
  ) THEN
    CREATE POLICY quality_metrics_select_same_org
      ON public.quality_metrics
      FOR SELECT
      TO authenticated
      USING (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'quality_metrics'
      AND policyname = 'quality_metrics_insert_same_org'
  ) THEN
    CREATE POLICY quality_metrics_insert_same_org
      ON public.quality_metrics
      FOR INSERT
      TO authenticated
      WITH CHECK (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_versions'
      AND policyname = 'report_versions_select_same_org'
  ) THEN
    CREATE POLICY report_versions_select_same_org
      ON public.report_versions
      FOR SELECT
      TO authenticated
      USING (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'report_versions'
      AND policyname = 'report_versions_insert_same_org'
  ) THEN
    CREATE POLICY report_versions_insert_same_org
      ON public.report_versions
      FOR INSERT
      TO authenticated
      WITH CHECK (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'integration_sync_events'
      AND policyname = 'integration_sync_events_select_same_org'
  ) THEN
    CREATE POLICY integration_sync_events_select_same_org
      ON public.integration_sync_events
      FOR SELECT
      TO authenticated
      USING (organization_id = public.current_org_id());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'integration_sync_events'
      AND policyname = 'integration_sync_events_insert_same_org'
  ) THEN
    CREATE POLICY integration_sync_events_insert_same_org
      ON public.integration_sync_events
      FOR INSERT
      TO authenticated
      WITH CHECK (organization_id = public.current_org_id());
  END IF;
END $$;

COMMIT;
