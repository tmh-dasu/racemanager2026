
-- Drop view first (depends on columns)
DROP VIEW IF EXISTS public.managers_public;

-- Drop old joker_transfers table
DROP TABLE IF EXISTS public.joker_transfers;

-- Remove old columns
ALTER TABLE public.managers DROP COLUMN IF EXISTS joker_used;
ALTER TABLE public.managers DROP COLUMN IF EXISTS emergency_transfer_used;

-- Recreate clean view
CREATE VIEW public.managers_public AS
SELECT id, name, team_name, total_points, budget_remaining, created_at, slug
FROM public.managers;
