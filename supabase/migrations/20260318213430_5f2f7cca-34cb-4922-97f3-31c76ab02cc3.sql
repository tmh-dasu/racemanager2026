CREATE OR REPLACE VIEW public.managers_public 
  WITH (security_invoker = true) AS
  SELECT id, name, team_name, total_points, joker_used, budget_remaining, created_at, slug
  FROM public.managers;

GRANT SELECT ON public.managers_public TO anon, authenticated;