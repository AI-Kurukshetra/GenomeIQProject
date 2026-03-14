-- GenomeIQ initial schema (Phase 1)

-- Extensions
create extension if not exists "pgcrypto";

-- Enums
DO $$
BEGIN
  CREATE TYPE public.user_role AS ENUM ('clinician', 'researcher', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.sample_status AS ENUM ('uploaded', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.variant_classification AS ENUM ('pathogenic', 'likely_pathogenic', 'uncertain', 'likely_benign', 'benign');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.report_status AS ENUM ('draft', 'finalized');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE public.annotation_source AS ENUM ('clinvar', 'omim', 'gnomad');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tables
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'clinician',
  organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper function to resolve current user's organization
CREATE OR REPLACE FUNCTION public.current_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.organization_id
  FROM public.users u
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

CREATE TABLE IF NOT EXISTS public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  date_of_birth date,
  gender text,
  phenotypes jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patients_external_id_org_unique UNIQUE (org_id, external_id)
);

CREATE TABLE IF NOT EXISTS public.genomic_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  sample_type text NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  status public.sample_status NOT NULL DEFAULT 'uploaded',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL REFERENCES public.genomic_samples(id) ON DELETE CASCADE,
  gene text NOT NULL,
  chromosome text NOT NULL,
  position integer NOT NULL,
  ref_allele text NOT NULL,
  alt_allele text NOT NULL,
  zygosity text NOT NULL,
  classification public.variant_classification NOT NULL DEFAULT 'uncertain',
  acmg_criteria jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clinical_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL REFERENCES public.genomic_samples(id) ON DELETE CASCADE,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  status public.report_status NOT NULL DEFAULT 'draft',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.annotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  variant_id uuid NOT NULL REFERENCES public.variants(id) ON DELETE CASCADE,
  source public.annotation_source NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS users_org_id_idx ON public.users(organization_id);
CREATE INDEX IF NOT EXISTS patients_org_id_idx ON public.patients(org_id);
CREATE INDEX IF NOT EXISTS patients_external_id_idx ON public.patients(org_id, external_id);
CREATE INDEX IF NOT EXISTS genomic_samples_patient_id_idx ON public.genomic_samples(patient_id);
CREATE INDEX IF NOT EXISTS genomic_samples_status_idx ON public.genomic_samples(status);
CREATE INDEX IF NOT EXISTS variants_sample_id_idx ON public.variants(sample_id);
CREATE INDEX IF NOT EXISTS variants_gene_idx ON public.variants(gene);
CREATE INDEX IF NOT EXISTS variants_classification_idx ON public.variants(classification);
CREATE INDEX IF NOT EXISTS variants_chr_pos_idx ON public.variants(chromosome, position);
CREATE INDEX IF NOT EXISTS clinical_reports_sample_id_idx ON public.clinical_reports(sample_id);
CREATE INDEX IF NOT EXISTS clinical_reports_status_idx ON public.clinical_reports(status);
CREATE INDEX IF NOT EXISTS annotations_variant_id_idx ON public.annotations(variant_id);
CREATE INDEX IF NOT EXISTS annotations_source_idx ON public.annotations(source);

-- RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.genomic_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.annotations ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY organizations_select
ON public.organizations
FOR SELECT
USING (id = public.current_org_id());

CREATE POLICY organizations_insert
ON public.organizations
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY organizations_update
ON public.organizations
FOR UPDATE
USING (id = public.current_org_id())
WITH CHECK (id = public.current_org_id());

-- Users policies
CREATE POLICY users_select
ON public.users
FOR SELECT
USING (organization_id = public.current_org_id());

CREATE POLICY users_insert
ON public.users
FOR INSERT
WITH CHECK (id = auth.uid());

CREATE POLICY users_update_self
ON public.users
FOR UPDATE
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Patients policies
CREATE POLICY patients_select
ON public.patients
FOR SELECT
USING (org_id = public.current_org_id());

CREATE POLICY patients_insert
ON public.patients
FOR INSERT
WITH CHECK (org_id = public.current_org_id());

CREATE POLICY patients_update
ON public.patients
FOR UPDATE
USING (org_id = public.current_org_id())
WITH CHECK (org_id = public.current_org_id());

CREATE POLICY patients_delete
ON public.patients
FOR DELETE
USING (org_id = public.current_org_id());

-- Genomic samples policies
CREATE POLICY genomic_samples_select
ON public.genomic_samples
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = public.genomic_samples.patient_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY genomic_samples_insert
ON public.genomic_samples
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = public.genomic_samples.patient_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY genomic_samples_update
ON public.genomic_samples
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = public.genomic_samples.patient_id
      AND p.org_id = public.current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = public.genomic_samples.patient_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY genomic_samples_delete
ON public.genomic_samples
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.patients p
    WHERE p.id = public.genomic_samples.patient_id
      AND p.org_id = public.current_org_id()
  )
);

-- Variants policies
CREATE POLICY variants_select
ON public.variants
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.variants.sample_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY variants_insert
ON public.variants
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.variants.sample_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY variants_update
ON public.variants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.variants.sample_id
      AND p.org_id = public.current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.variants.sample_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY variants_delete
ON public.variants
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.variants.sample_id
      AND p.org_id = public.current_org_id()
  )
);

-- Clinical reports policies
CREATE POLICY clinical_reports_select
ON public.clinical_reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.clinical_reports.sample_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY clinical_reports_insert
ON public.clinical_reports
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.clinical_reports.sample_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY clinical_reports_update
ON public.clinical_reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.clinical_reports.sample_id
      AND p.org_id = public.current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.clinical_reports.sample_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY clinical_reports_delete
ON public.clinical_reports
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.genomic_samples gs
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE gs.id = public.clinical_reports.sample_id
      AND p.org_id = public.current_org_id()
  )
);

-- Annotations policies
CREATE POLICY annotations_select
ON public.annotations
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.variants v
    JOIN public.genomic_samples gs ON gs.id = v.sample_id
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE v.id = public.annotations.variant_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY annotations_insert
ON public.annotations
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.variants v
    JOIN public.genomic_samples gs ON gs.id = v.sample_id
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE v.id = public.annotations.variant_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY annotations_update
ON public.annotations
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.variants v
    JOIN public.genomic_samples gs ON gs.id = v.sample_id
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE v.id = public.annotations.variant_id
      AND p.org_id = public.current_org_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.variants v
    JOIN public.genomic_samples gs ON gs.id = v.sample_id
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE v.id = public.annotations.variant_id
      AND p.org_id = public.current_org_id()
  )
);

CREATE POLICY annotations_delete
ON public.annotations
FOR DELETE
USING (
  EXISTS (
    SELECT 1
    FROM public.variants v
    JOIN public.genomic_samples gs ON gs.id = v.sample_id
    JOIN public.patients p ON p.id = gs.patient_id
    WHERE v.id = public.annotations.variant_id
      AND p.org_id = public.current_org_id()
  )
);
