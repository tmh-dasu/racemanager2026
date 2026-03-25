
-- Recreate managers_public view to include emergency_transfer_used
CREATE OR REPLACE VIEW public.managers_public AS
SELECT id, name, team_name, total_points, joker_used, budget_remaining, created_at, slug, emergency_transfer_used
FROM public.managers;
