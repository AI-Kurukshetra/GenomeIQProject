INSERT INTO storage.buckets (id, name, public)
VALUES ('genomic-samples', 'genomic-samples', false)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'genomic_samples_select'
  ) THEN
    CREATE POLICY genomic_samples_select
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'genomic-samples'
      AND (storage.foldername(name))[1] = (public.current_org_id())::text
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'genomic_samples_insert'
  ) THEN
    CREATE POLICY genomic_samples_insert
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'genomic-samples'
      AND (storage.foldername(name))[1] = (public.current_org_id())::text
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'genomic_samples_update'
  ) THEN
    CREATE POLICY genomic_samples_update
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'genomic-samples'
      AND (storage.foldername(name))[1] = (public.current_org_id())::text
    )
    WITH CHECK (
      bucket_id = 'genomic-samples'
      AND (storage.foldername(name))[1] = (public.current_org_id())::text
    );
  END IF;
END $$;
