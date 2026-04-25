CREATE OR REPLACE FUNCTION public.enforce_transfer_deadline()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_race_start timestamp with time zone;
  deadline timestamp with time zone;
  unscored_race_id uuid;
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Block transfers if a finished race is missing results
  SELECT r.id INTO unscored_race_id
  FROM public.races r
  WHERE r.race_date IS NOT NULL
    AND COALESCE(r.race_end_date, r.race_date) <= now()
    AND NOT EXISTS (SELECT 1 FROM public.race_results rr WHERE rr.race_id = r.id)
  ORDER BY COALESCE(r.race_end_date, r.race_date) ASC
  LIMIT 1;

  IF unscored_race_id IS NOT NULL THEN
    RAISE EXCEPTION 'Transfers er låst indtil resultaterne for forrige runde er uploadet';
  END IF;

  -- Existing rule: must be a future race, and deadline = 1h before start
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