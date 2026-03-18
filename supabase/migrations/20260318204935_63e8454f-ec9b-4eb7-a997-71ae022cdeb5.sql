
DROP VIEW IF EXISTS public.managers_public;
CREATE VIEW public.managers_public
WITH (security_invoker = true)
AS SELECT id, name, team_name, total_points, joker_used, budget_remaining, created_at
FROM public.managers;
