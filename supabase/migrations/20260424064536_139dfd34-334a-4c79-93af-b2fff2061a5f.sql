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
  -- Admins bypass
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Find the next upcoming race
  SELECT race_date INTO next_race_start
  FROM public.races
  WHERE race_date IS NOT NULL AND race_date > now()
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

DROP TRIGGER IF EXISTS enforce_transfer_deadline_trigger ON public.transfers;
CREATE TRIGGER enforce_transfer_deadline_trigger
BEFORE INSERT ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_transfer_deadline();