ALTER TABLE public.races
  ADD COLUMN IF NOT EXISTS address text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS links jsonb DEFAULT '[]'::jsonb;