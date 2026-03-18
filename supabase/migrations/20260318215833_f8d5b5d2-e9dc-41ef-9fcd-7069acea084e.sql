-- 1. Drop the overly permissive anon SELECT policy on raw managers table
DROP POLICY IF EXISTS "Anyone can read managers via public view" ON public.managers;

-- 2. Recreate managers_public view with security_definer so it bypasses RLS
--    but only exposes safe columns (no email, no user_id)
CREATE OR REPLACE VIEW public.managers_public
WITH (security_invoker = false)
AS
SELECT
  id,
  name,
  team_name,
  total_points,
  joker_used,
  budget_remaining,
  created_at,
  slug
FROM public.managers;

-- 3. Ensure anon and authenticated can select from the view
GRANT SELECT ON public.managers_public TO anon, authenticated;