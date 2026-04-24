
CREATE OR REPLACE FUNCTION public.enforce_captain_deadline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deadline timestamp with time zone;
  race_start timestamp with time zone;
BEGIN
  SELECT race_date INTO race_start FROM public.races WHERE id = NEW.race_id;
  
  IF race_start IS NOT NULL THEN
    deadline := race_start - interval '1 hour';
  ELSE
    SELECT captain_deadline INTO deadline FROM public.races WHERE id = NEW.race_id;
  END IF;
  
  IF deadline IS NOT NULL AND now() > deadline THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Captain deadline has passed for this race (1h before start)';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_transfer_deadline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_race_start timestamp with time zone;
  deadline timestamp with time zone;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  SELECT race_date INTO next_race_start
  FROM public.races
  WHERE race_date IS NOT NULL
    AND COALESCE(race_end_date, race_date) > now()
  ORDER BY race_date ASC
  LIMIT 1;

  IF next_race_start IS NULL THEN
    RAISE EXCEPTION 'No upcoming race - transfers are closed';
  END IF;

  deadline := next_race_start - interval '1 hour';

  IF now() > deadline THEN
    RAISE EXCEPTION 'Transfer deadline has passed (1h before next race)';
  END IF;

  RETURN NEW;
END;
$function$;

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
  SELECT pq.prediction_deadline INTO deadline FROM public.prediction_questions pq WHERE pq.id = NEW.question_id;
  
  IF deadline IS NULL THEN
    SELECT r.race_date INTO race_start
    FROM public.races r 
    JOIN public.prediction_questions pq ON pq.race_id = r.id 
    WHERE pq.id = NEW.question_id;
    
    IF race_start IS NOT NULL THEN
      deadline := race_start - interval '1 hour';
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
