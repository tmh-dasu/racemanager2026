
-- 1. Table
CREATE TABLE IF NOT EXISTS public.manager_round_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL,
  race_id uuid NOT NULL,
  race_points integer NOT NULL DEFAULT 0,
  captain_bonus integer NOT NULL DEFAULT 0,
  prediction_points integer NOT NULL DEFAULT 0,
  transfer_costs integer NOT NULL DEFAULT 0,
  total integer NOT NULL DEFAULT 0,
  team_snapshot uuid[] NOT NULL DEFAULT '{}',
  captain_driver_id uuid,
  computed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (manager_id, race_id)
);
CREATE INDEX IF NOT EXISTS idx_mrp_manager ON public.manager_round_points(manager_id);
CREATE INDEX IF NOT EXISTS idx_mrp_race ON public.manager_round_points(race_id);

ALTER TABLE public.manager_round_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read manager_round_points"
  ON public.manager_round_points FOR SELECT USING (true);

CREATE POLICY "Service role can manage manager_round_points"
  ON public.manager_round_points FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- 2. Allow protect_manager_fields to be bypassed during recompute
CREATE OR REPLACE FUNCTION public.protect_manager_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('app.recompute_in_progress', true) = 'on' THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.total_points := OLD.total_points;
  NEW.budget_remaining := OLD.budget_remaining;
  RETURN NEW;
END;
$$;

-- 3. Recompute function for one (manager, race)
CREATE OR REPLACE FUNCTION public.recompute_manager_round(p_manager_id uuid, p_race_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  m_created timestamptz;
  r_date timestamptz;
  team_set uuid[];
  cap_driver uuid;
  rp integer := 0;
  cb integer := 0;
  pp integer := 0;
  tc integer := 0;
  t RECORD;
  new_total integer;
BEGIN
  SELECT created_at INTO m_created FROM public.managers WHERE id = p_manager_id;
  SELECT race_date INTO r_date FROM public.races WHERE id = p_race_id;

  IF m_created IS NULL OR r_date IS NULL THEN
    DELETE FROM public.manager_round_points WHERE manager_id = p_manager_id AND race_id = p_race_id;
  ELSIF m_created > r_date - interval '1 hour' THEN
    -- Manager not eligible
    DELETE FROM public.manager_round_points WHERE manager_id = p_manager_id AND race_id = p_race_id;
  ELSE
    -- Reconstruct historical team
    SELECT array_agg(driver_id) INTO team_set FROM public.manager_drivers WHERE manager_id = p_manager_id;
    IF team_set IS NULL THEN team_set := ARRAY[]::uuid[]; END IF;

    FOR t IN
      SELECT old_driver_id, new_driver_id FROM public.transfers
      WHERE manager_id = p_manager_id AND created_at > r_date
      ORDER BY created_at DESC
    LOOP
      team_set := array_remove(team_set, t.new_driver_id);
      team_set := array_append(team_set, t.old_driver_id);
    END LOOP;

    SELECT COALESCE(SUM(points),0) INTO rp
    FROM public.race_results WHERE race_id = p_race_id AND driver_id = ANY(team_set);

    SELECT driver_id INTO cap_driver
    FROM public.captain_selections WHERE manager_id = p_manager_id AND race_id = p_race_id;

    IF cap_driver IS NOT NULL THEN
      SELECT COALESCE(SUM(points),0) INTO cb
      FROM public.race_results WHERE race_id = p_race_id AND driver_id = cap_driver;
    END IF;

    SELECT COALESCE(COUNT(*) * 5, 0) INTO pp
    FROM public.prediction_answers pa
    JOIN public.prediction_questions pq ON pq.id = pa.question_id
    WHERE pa.manager_id = p_manager_id AND pa.is_correct = true AND pq.race_id = p_race_id;

    INSERT INTO public.manager_round_points (
      manager_id, race_id, race_points, captain_bonus, prediction_points,
      transfer_costs, total, team_snapshot, captain_driver_id, computed_at
    ) VALUES (
      p_manager_id, p_race_id, rp, cb, pp, 0, rp+cb+pp, team_set, cap_driver, now()
    )
    ON CONFLICT (manager_id, race_id) DO UPDATE SET
      race_points = EXCLUDED.race_points,
      captain_bonus = EXCLUDED.captain_bonus,
      prediction_points = EXCLUDED.prediction_points,
      total = EXCLUDED.race_points + EXCLUDED.captain_bonus + EXCLUDED.prediction_points,
      team_snapshot = EXCLUDED.team_snapshot,
      captain_driver_id = EXCLUDED.captain_driver_id,
      computed_at = now();
  END IF;

  -- Update manager total: SUM(per-round totals) - SUM(all transfer costs)
  SELECT COALESCE(SUM(point_cost),0) INTO tc FROM public.transfers WHERE manager_id = p_manager_id;
  SELECT COALESCE(SUM(total),0) INTO new_total FROM public.manager_round_points WHERE manager_id = p_manager_id;
  new_total := new_total - tc;

  PERFORM set_config('app.recompute_in_progress', 'on', true);
  UPDATE public.managers SET total_points = new_total WHERE id = p_manager_id;
  PERFORM set_config('app.recompute_in_progress', 'off', true);
END;
$$;

-- 4. Recompute helpers
CREATE OR REPLACE FUNCTION public.recompute_manager_all_rounds(p_manager_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.races WHERE race_date IS NOT NULL LOOP
    PERFORM public.recompute_manager_round(p_manager_id, r.id);
  END LOOP;
END; $$;

CREATE OR REPLACE FUNCTION public.recompute_race_all_managers(p_race_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE m RECORD;
BEGIN
  FOR m IN SELECT id FROM public.managers LOOP
    PERFORM public.recompute_manager_round(m.id, p_race_id);
  END LOOP;
END; $$;

-- 5. Trigger functions
CREATE OR REPLACE FUNCTION public.trg_recompute_on_race_result()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recompute_race_all_managers(COALESCE(NEW.race_id, OLD.race_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_on_transfer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recompute_manager_all_rounds(COALESCE(NEW.manager_id, OLD.manager_id));
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_on_captain()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  PERFORM public.recompute_manager_round(
    COALESCE(NEW.manager_id, OLD.manager_id),
    COALESCE(NEW.race_id, OLD.race_id)
  );
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_on_prediction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE r_id uuid;
BEGIN
  SELECT race_id INTO r_id FROM public.prediction_questions
    WHERE id = COALESCE(NEW.question_id, OLD.question_id);
  IF r_id IS NOT NULL THEN
    PERFORM public.recompute_manager_round(COALESCE(NEW.manager_id, OLD.manager_id), r_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE OR REPLACE FUNCTION public.trg_recompute_on_race_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.race_date IS DISTINCT FROM OLD.race_date THEN
    PERFORM public.recompute_race_all_managers(NEW.id);
  END IF;
  RETURN NEW;
END; $$;

-- 6. Attach triggers
DROP TRIGGER IF EXISTS recompute_on_race_result ON public.race_results;
CREATE TRIGGER recompute_on_race_result
  AFTER INSERT OR UPDATE OR DELETE ON public.race_results
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_on_race_result();

DROP TRIGGER IF EXISTS recompute_on_transfer ON public.transfers;
CREATE TRIGGER recompute_on_transfer
  AFTER INSERT OR DELETE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_on_transfer();

DROP TRIGGER IF EXISTS recompute_on_captain ON public.captain_selections;
CREATE TRIGGER recompute_on_captain
  AFTER INSERT OR UPDATE OR DELETE ON public.captain_selections
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_on_captain();

DROP TRIGGER IF EXISTS recompute_on_prediction ON public.prediction_answers;
CREATE TRIGGER recompute_on_prediction
  AFTER INSERT OR UPDATE OR DELETE ON public.prediction_answers
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_on_prediction();

DROP TRIGGER IF EXISTS recompute_on_race_change ON public.races;
CREATE TRIGGER recompute_on_race_change
  AFTER UPDATE ON public.races
  FOR EACH ROW EXECUTE FUNCTION public.trg_recompute_on_race_change();

-- 7. Initial backfill
DO $$
DECLARE m RECORD; r RECORD;
BEGIN
  FOR m IN SELECT id FROM public.managers LOOP
    FOR r IN SELECT id FROM public.races WHERE race_date IS NOT NULL LOOP
      PERFORM public.recompute_manager_round(m.id, r.id);
    END LOOP;
  END LOOP;
END $$;
