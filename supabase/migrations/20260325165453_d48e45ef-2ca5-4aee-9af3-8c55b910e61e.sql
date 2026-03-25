-- Add captain_deadline to races
ALTER TABLE public.races ADD COLUMN captain_deadline timestamp with time zone DEFAULT NULL;

-- Create captain_selections table
CREATE TABLE public.captain_selections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE,
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(manager_id, race_id)
);

ALTER TABLE public.captain_selections ENABLE ROW LEVEL SECURITY;

-- Anyone can read (for leaderboard/results)
CREATE POLICY "Anyone can read captain_selections" ON public.captain_selections FOR SELECT TO public USING (true);

-- Owner can insert their own captain selection
CREATE POLICY "Owner can insert captain_selection" ON public.captain_selections FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.managers WHERE managers.id = captain_selections.manager_id AND managers.user_id = auth.uid())
);

-- Owner can update their own captain selection
CREATE POLICY "Owner can update captain_selection" ON public.captain_selections FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.managers WHERE managers.id = captain_selections.manager_id AND managers.user_id = auth.uid())
);

-- Owner or admin can delete
CREATE POLICY "Owner or admin can delete captain_selection" ON public.captain_selections FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.managers WHERE managers.id = captain_selections.manager_id AND managers.user_id = auth.uid())
  OR public.has_role(auth.uid(), 'admin')
);

-- Enforce max 2 captaincies per driver per manager
CREATE OR REPLACE FUNCTION public.enforce_captain_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  captain_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO captain_count
  FROM public.captain_selections
  WHERE manager_id = NEW.manager_id AND driver_id = NEW.driver_id
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF captain_count >= 2 THEN
    RAISE EXCEPTION 'Each driver can only be captain 2 times per season';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_captain_limit_trigger
  BEFORE INSERT OR UPDATE ON public.captain_selections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_captain_limit();

-- Enforce captain deadline
CREATE OR REPLACE FUNCTION public.enforce_captain_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deadline timestamp with time zone;
BEGIN
  SELECT captain_deadline INTO deadline FROM public.races WHERE id = NEW.race_id;
  
  IF deadline IS NOT NULL AND now() > deadline THEN
    -- Allow admins to bypass deadline
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Captain deadline has passed for this race';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_captain_deadline_trigger
  BEFORE INSERT OR UPDATE ON public.captain_selections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_captain_deadline();