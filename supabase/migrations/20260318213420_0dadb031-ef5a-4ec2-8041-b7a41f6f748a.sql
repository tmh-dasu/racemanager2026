ALTER TABLE public.drivers 
  ADD COLUMN IF NOT EXISTS bio text DEFAULT '',
  ADD COLUMN IF NOT EXISTS club text DEFAULT '',
  ADD COLUMN IF NOT EXISTS quote text DEFAULT '';

ALTER TABLE public.managers
  ADD COLUMN IF NOT EXISTS slug text;

UPDATE public.managers SET slug = lower(regexp_replace(replace(replace(replace(team_name, 'æ', 'ae'), 'ø', 'oe'), 'å', 'aa'), '[^a-z0-9]+', '-', 'g')) WHERE slug IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS managers_slug_unique ON public.managers(slug);

CREATE OR REPLACE VIEW public.managers_public AS
  SELECT id, name, team_name, total_points, joker_used, budget_remaining, created_at, slug
  FROM public.managers;