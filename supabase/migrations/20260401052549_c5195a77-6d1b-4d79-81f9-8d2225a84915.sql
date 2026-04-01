
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

  -- Non-admins: protect total_points and budget_remaining
  NEW.total_points := OLD.total_points;
  NEW.budget_remaining := OLD.budget_remaining;

  RETURN NEW;
END;
$function$;
