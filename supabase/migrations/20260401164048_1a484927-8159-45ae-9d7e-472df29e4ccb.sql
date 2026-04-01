
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
  -- Get race_date and compute deadline as 24h before
  SELECT race_date INTO race_start FROM public.races WHERE id = NEW.race_id;
  
  IF race_start IS NOT NULL THEN
    deadline := race_start - interval '24 hours';
  ELSE
    -- Fallback to legacy captain_deadline
    SELECT captain_deadline INTO deadline FROM public.races WHERE id = NEW.race_id;
  END IF;
  
  IF deadline IS NOT NULL AND now() > deadline THEN
    -- Allow admins to bypass deadline
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Captain deadline has passed for this race (24h before start)';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
