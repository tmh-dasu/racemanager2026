CREATE OR REPLACE FUNCTION public.enforce_prediction_deadline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deadline timestamp with time zone;
  race_start timestamp with time zone;
BEGIN
  -- First check explicit prediction_deadline
  SELECT pq.prediction_deadline INTO deadline FROM public.prediction_questions pq WHERE pq.id = NEW.question_id;
  
  -- Fallback to race_date - 24 hours (same as captain/transfer deadline)
  IF deadline IS NULL THEN
    SELECT r.race_date INTO race_start
    FROM public.races r 
    JOIN public.prediction_questions pq ON pq.race_id = r.id 
    WHERE pq.id = NEW.question_id;
    
    IF race_start IS NOT NULL THEN
      deadline := race_start - interval '24 hours';
    END IF;
  END IF;
  
  IF deadline IS NOT NULL AND now() > deadline THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Prediction deadline has passed';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;