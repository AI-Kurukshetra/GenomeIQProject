-- Rename sex column to gender in patients table
ALTER TABLE public.patients 
RENAME COLUMN sex TO gender;
