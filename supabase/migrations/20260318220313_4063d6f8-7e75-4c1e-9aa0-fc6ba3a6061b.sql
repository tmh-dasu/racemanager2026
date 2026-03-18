-- Mask existing manager names that look like email addresses
UPDATE public.managers
SET name = split_part(name, '@', 1)
WHERE name LIKE '%@%';

-- Update the managers_public view to mask any future emails that slip through
CREATE OR REPLACE VIEW public.managers_public
WITH (security_invoker = false)
AS
SELECT
  id,
  CASE WHEN name LIKE '%@%' THEN split_part(name, '@', 1) ELSE name END AS name,
  team_name,
  total_points,
  joker_used,
  budget_remaining,
  created_at,
  slug
FROM public.managers;

GRANT SELECT ON public.managers_public TO anon, authenticated;