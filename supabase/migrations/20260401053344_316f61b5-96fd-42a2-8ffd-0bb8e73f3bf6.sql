
-- Drop the unique constraint (not index) on prediction_questions.race_id
ALTER TABLE public.prediction_questions DROP CONSTRAINT IF EXISTS prediction_questions_race_id_key;

-- Add new columns to prediction_questions
ALTER TABLE public.prediction_questions 
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS prediction_deadline timestamp with time zone,
  ADD COLUMN IF NOT EXISTS option_a text,
  ADD COLUMN IF NOT EXISTS option_b text;

-- Update the enforce_prediction_deadline function to use prediction_deadline from the question itself
CREATE OR REPLACE FUNCTION public.enforce_prediction_deadline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deadline timestamp with time zone;
BEGIN
  SELECT pq.prediction_deadline INTO deadline FROM public.prediction_questions pq WHERE pq.id = NEW.question_id;
  
  IF deadline IS NULL THEN
    SELECT r.captain_deadline INTO deadline 
    FROM public.races r 
    JOIN public.prediction_questions pq ON pq.race_id = r.id 
    WHERE pq.id = NEW.question_id;
  END IF;
  
  IF deadline IS NOT NULL AND now() > deadline THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Prediction deadline has passed';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
