
-- Add session_type to race_results
ALTER TABLE public.race_results ADD COLUMN IF NOT EXISTS session_type text NOT NULL DEFAULT 'heat1';

-- Drop old unique constraint and create new one including session_type
ALTER TABLE public.race_results DROP CONSTRAINT IF EXISTS race_results_race_id_driver_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS race_results_race_driver_session_key ON public.race_results (race_id, driver_id, session_type);
