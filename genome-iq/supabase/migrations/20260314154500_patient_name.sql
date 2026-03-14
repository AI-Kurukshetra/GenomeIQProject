ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS name text;

UPDATE public.patients
SET name = external_id
WHERE name IS NULL;

ALTER TABLE public.patients
ALTER COLUMN name SET NOT NULL;

CREATE INDEX IF NOT EXISTS patients_name_idx
ON public.patients(org_id, name);
