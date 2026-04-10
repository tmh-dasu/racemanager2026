
-- Drop the overly permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can read managers" ON public.managers;

-- Recreate the view without security_invoker so it bypasses RLS
-- (view owner has full access, but only non-sensitive columns are exposed)
DROP VIEW IF EXISTS public.managers_public;
CREATE VIEW public.managers_public AS
  SELECT id, name, team_name, total_points, budget_remaining, created_at, slug
  FROM public.managers;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.managers_public TO anon, authenticated;
