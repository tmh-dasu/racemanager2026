
-- 1. Replace protect_manager_fields to allow owner to flip joker_used false→true
CREATE OR REPLACE FUNCTION public.protect_manager_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Admins can update anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Non-admins: protect total_points always
  NEW.total_points := OLD.total_points;

  -- Allow owner to flip joker_used from false to true (one-way only)
  IF OLD.joker_used = false AND NEW.joker_used = true THEN
    -- allowed: keep NEW.joker_used = true
    -- also allow budget_remaining update in this case (joker swap changes budget)
    NULL;
  ELSE
    -- reset protected fields to old values
    NEW.joker_used := OLD.joker_used;
    NEW.budget_remaining := OLD.budget_remaining;
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Enforce max 3 drivers per manager at DB level
CREATE OR REPLACE FUNCTION public.enforce_max_drivers()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  driver_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO driver_count
  FROM public.manager_drivers
  WHERE manager_id = NEW.manager_id;

  IF driver_count >= 3 THEN
    RAISE EXCEPTION 'A manager can have at most 3 drivers';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_max_drivers_trigger
  BEFORE INSERT ON public.manager_drivers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_drivers();
