-- Backend structures for knowledge base, consent, collaboration, integrations, and multi-omics

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
  CREATE TYPE public.omics_modality AS ENUM ('genomics', 'transcriptomics', 'proteomics', 'epigenomics');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.genes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  summary text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  category text,
  description text,
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
ALTER TABLE public.gene_disease_associations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.omics_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collaboration_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_endpoints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'genes' AND policyname = 'genes_select_authenticated'
  ) THEN
    CREATE POLICY genes_select_authenticated
    ON public.genes
    FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'genes' AND policyname = 'genes_insert_authenticated'
  ) THEN
    CREATE POLICY genes_insert_authenticated
    ON public.genes
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'genes' AND policyname = 'genes_update_authenticated'
  ) THEN
    CREATE POLICY genes_update_authenticated
    ON public.genes
    FOR UPDATE TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diseases' AND policyname = 'diseases_select_authenticated'
  ) THEN
    CREATE POLICY diseases_select_authenticated
    ON public.diseases
    FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diseases' AND policyname = 'diseases_insert_authenticated'
  ) THEN
    CREATE POLICY diseases_insert_authenticated
    ON public.diseases
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'diseases' AND policyname = 'diseases_update_authenticated'
  ) THEN
    CREATE POLICY diseases_update_authenticated
    ON public.diseases
    FOR UPDATE TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gene_disease_associations' AND policyname = 'gene_disease_associations_select_authenticated'
  ) THEN
    CREATE POLICY gene_disease_associations_select_authenticated
    ON public.gene_disease_associations
    FOR SELECT TO authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gene_disease_associations' AND policyname = 'gene_disease_associations_insert_authenticated'
  ) THEN
    CREATE POLICY gene_disease_associations_insert_authenticated
    ON public.gene_disease_associations
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'gene_disease_associations' AND policyname = 'gene_disease_associations_update_authenticated'
  ) THEN
    CREATE POLICY gene_disease_associations_update_authenticated
    ON public.gene_disease_associations
    FOR UPDATE TO authenticated
    USING (auth.uid() IS NOT NULL)
    WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

DO $$
DECLARE
  table_name text;
  scoped_tables text[] := ARRAY[
    'consents',
    'omics_datasets',
    'collaboration_comments',
    'integration_endpoints'
  ];
BEGIN
  FOREACH table_name IN ARRAY scoped_tables LOOP
    EXECUTE format(
      'DO $inner$ BEGIN IF NOT EXISTS (
         SELECT 1 FROM pg_policies
         WHERE schemaname = ''public'' AND tablename = %L AND policyname = %L
       ) THEN
         EXECUTE %L;
       END IF; END $inner$;',
      table_name,
      table_name || '_select',
      'CREATE POLICY ' || quote_ident(table_name || '_select') ||
      ' ON public.' || quote_ident(table_name) ||
      ' FOR SELECT USING (organization_id = public.current_org_id())'
    );

    EXECUTE format(
      'DO $inner$ BEGIN IF NOT EXISTS (
         SELECT 1 FROM pg_policies
         WHERE schemaname = ''public'' AND tablename = %L AND policyname = %L
       ) THEN
         EXECUTE %L;
       END IF; END $inner$;',
      table_name,
      table_name || '_insert',
      'CREATE POLICY ' || quote_ident(table_name || '_insert') ||
      ' ON public.' || quote_ident(table_name) ||
      ' FOR INSERT WITH CHECK (organization_id = public.current_org_id())'
    );

    EXECUTE format(
      'DO $inner$ BEGIN IF NOT EXISTS (
         SELECT 1 FROM pg_policies
         WHERE schemaname = ''public'' AND tablename = %L AND policyname = %L
       ) THEN
         EXECUTE %L;
       END IF; END $inner$;',
      table_name,
      table_name || '_update',
      'CREATE POLICY ' || quote_ident(table_name || '_update') ||
      ' ON public.' || quote_ident(table_name) ||
      ' FOR UPDATE USING (organization_id = public.current_org_id()) WITH CHECK (organization_id = public.current_org_id())'
    );

    EXECUTE format(
      'DO $inner$ BEGIN IF NOT EXISTS (
         SELECT 1 FROM pg_policies
         WHERE schemaname = ''public'' AND tablename = %L AND policyname = %L
       ) THEN
         EXECUTE %L;
       END IF; END $inner$;',
      table_name,
      table_name || '_delete',
      'CREATE POLICY ' || quote_ident(table_name || '_delete') ||
      ' ON public.' || quote_ident(table_name) ||
      ' FOR DELETE USING (organization_id = public.current_org_id())'
    );
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS consents_patient_id_idx ON public.consents(patient_id);
CREATE INDEX IF NOT EXISTS omics_datasets_patient_id_idx ON public.omics_datasets(patient_id);
CREATE INDEX IF NOT EXISTS omics_datasets_sample_id_idx ON public.omics_datasets(sample_id);
CREATE INDEX IF NOT EXISTS collaboration_comments_patient_id_idx ON public.collaboration_comments(patient_id);
CREATE INDEX IF NOT EXISTS integration_endpoints_org_id_idx ON public.integration_endpoints(organization_id);
