
SET LOCAL session_replication_role = replica;

DO $$
DECLARE
  mgr RECORD;
  rec RECORD;
  team_set uuid[];
  base_points INT;
  captain_bonus INT;
  prediction_bonus INT;
  transfer_costs INT;
  t RECORD;
  rp INT;
  cap_driver uuid;
BEGIN
  FOR mgr IN SELECT id, created_at FROM public.managers LOOP
    base_points := 0;
    captain_bonus := 0;

    FOR rec IN
      SELECT r.id AS race_id, r.race_date
      FROM public.races r
      WHERE EXISTS (SELECT 1 FROM public.race_results rr WHERE rr.race_id = r.id)
        AND r.race_date IS NOT NULL
        AND mgr.created_at <= r.race_date - interval '1 hour'
    LOOP
      SELECT array_agg(driver_id) INTO team_set
      FROM public.manager_drivers WHERE manager_id = mgr.id;
      IF team_set IS NULL THEN team_set := ARRAY[]::uuid[]; END IF;

      FOR t IN
        SELECT old_driver_id, new_driver_id
        FROM public.transfers
        WHERE manager_id = mgr.id AND created_at > rec.race_date
        ORDER BY created_at DESC
      LOOP
        team_set := array_remove(team_set, t.new_driver_id);
        team_set := array_append(team_set, t.old_driver_id);
      END LOOP;

      SELECT COALESCE(SUM(rr.points),0) INTO rp
      FROM public.race_results rr
      WHERE rr.race_id = rec.race_id AND rr.driver_id = ANY(team_set);
      base_points := base_points + rp;

      SELECT driver_id INTO cap_driver
      FROM public.captain_selections
      WHERE manager_id = mgr.id AND race_id = rec.race_id;

      IF cap_driver IS NOT NULL THEN
        SELECT COALESCE(SUM(points),0) INTO rp
        FROM public.race_results
        WHERE race_id = rec.race_id AND driver_id = cap_driver;
        captain_bonus := captain_bonus + rp;
      END IF;
    END LOOP;

    SELECT COALESCE(COUNT(*) * 5, 0) INTO prediction_bonus
    FROM public.prediction_answers
    WHERE manager_id = mgr.id AND is_correct = true;

    SELECT COALESCE(SUM(point_cost), 0) INTO transfer_costs
    FROM public.transfers WHERE manager_id = mgr.id;

    UPDATE public.managers
    SET total_points = base_points + captain_bonus + prediction_bonus - transfer_costs
    WHERE id = mgr.id;
  END LOOP;
END $$;
