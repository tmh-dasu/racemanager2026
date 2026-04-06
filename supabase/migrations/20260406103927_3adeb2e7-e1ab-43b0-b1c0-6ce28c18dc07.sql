
CREATE OR REPLACE FUNCTION public.enforce_transfer_values()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  new_driver_tier TEXT;
  tier_cost INTEGER;
BEGIN
  SELECT tier INTO new_driver_tier FROM public.drivers WHERE id = NEW.new_driver_id;

  CASE new_driver_tier
    WHEN 'gold' THEN tier_cost := 15;
    WHEN 'silver' THEN tier_cost := 10;
    WHEN 'bronze' THEN tier_cost := 5;
    ELSE tier_cost := 10;
  END CASE;

  IF EXISTS (SELECT 1 FROM public.drivers WHERE id = NEW.old_driver_id AND withdrawn = true) THEN
    NEW.is_free := true;
    NEW.point_cost := 0;
  ELSE
    NEW.is_free := false;
    NEW.point_cost := tier_cost;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_transfer_values
  BEFORE INSERT ON public.transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_transfer_values();
