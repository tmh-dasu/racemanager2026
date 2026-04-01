
CREATE OR REPLACE FUNCTION public.enforce_captain_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  captain_count INTEGER;
  driver_tier TEXT;
BEGIN
  -- Get the tier of the driver being selected as captain
  SELECT tier INTO driver_tier FROM public.drivers WHERE id = NEW.driver_id;

  -- Count how many times this manager has used captaincy for this tier slot
  -- (excluding the current selection being upserted)
  SELECT COUNT(*) INTO captain_count
  FROM public.captain_selections cs
  JOIN public.drivers d ON d.id = cs.driver_id
  WHERE cs.manager_id = NEW.manager_id 
    AND d.tier = driver_tier
    AND cs.id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF captain_count >= 2 THEN
    RAISE EXCEPTION 'Each tier slot can only be used for captain 2 times per season';
  END IF;

  RETURN NEW;
END;
$function$;
