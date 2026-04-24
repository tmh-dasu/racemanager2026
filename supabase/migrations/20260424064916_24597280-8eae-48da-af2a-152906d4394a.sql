ALTER TABLE public.races ADD COLUMN IF NOT EXISTS race_end_date timestamp with time zone;

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

  -- Next race = first race whose end (or start, if end missing) is still in the future
  SELECT race_date INTO next_race_start
  FROM public.races
  WHERE race_date IS NOT NULL
    AND COALESCE(race_end_date, race_date) > now()
  ORDER BY race_date ASC
  LIMIT 1;

  IF next_race_start IS NULL THEN
    RAISE EXCEPTION 'No upcoming race - transfers are closed';
  END IF;

  deadline := next_race_start - interval '24 hours';

  IF now() > deadline THEN
    RAISE EXCEPTION 'Transfer deadline has passed (24h before next race)';
  END IF;

  RETURN NEW;
END;
$function$;