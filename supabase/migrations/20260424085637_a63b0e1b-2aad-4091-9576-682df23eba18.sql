
CREATE OR REPLACE FUNCTION public.enforce_transfer_values()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_driver_tier TEXT;
  tier_cost INTEGER;
  any_round_completed BOOLEAN;
BEGIN
  -- Withdrawn driver swap is always free
  IF EXISTS (SELECT 1 FROM public.drivers WHERE id = NEW.old_driver_id AND withdrawn = true) THEN
    NEW.is_free := true;
    NEW.point_cost := 0;
    RETURN NEW;
  END IF;

  -- Free transfers as long as no round has been completed (no race_results yet)
  SELECT EXISTS (SELECT 1 FROM public.race_results LIMIT 1) INTO any_round_completed;
  IF NOT any_round_completed THEN
    NEW.is_free := true;
    NEW.point_cost := 0;
    RETURN NEW;
  END IF;

  -- Otherwise charge based on the incoming driver's tier
  SELECT tier INTO new_driver_tier FROM public.drivers WHERE id = NEW.new_driver_id;
  CASE new_driver_tier
    WHEN 'gold' THEN tier_cost := 15;
    WHEN 'silver' THEN tier_cost := 10;
    WHEN 'bronze' THEN tier_cost := 5;
    ELSE tier_cost := 10;
  END CASE;

  NEW.is_free := false;
  NEW.point_cost := tier_cost;
  RETURN NEW;
END;
$function$;
