
DO $$
DECLARE
  mgr RECORD;
  base_points INT;
  captain_bonus INT;
  prediction_bonus INT;
  transfer_costs INT;
  new_total INT;
BEGIN
  FOR mgr IN SELECT id, created_at FROM public.managers LOOP
    -- Base points: sum of race_results.points for drivers that were on the team AT race time.
    -- Historical team = current team, then for each transfer created AFTER race_date: undo it (remove new, add old).
    -- Eligibility: manager must have been created <= race_date - 1h.
    WITH current_team AS (
      SELECT driver_id FROM public.manager_drivers WHERE manager_id = mgr.id
    ),
    eligible_races AS (
      SELECT id AS race_id, race_date
      FROM public.races
      WHERE race_date IS NULL OR mgr.created_at <= race_date - interval '1 hour'
    ),
    historical_team AS (
      SELECT er.race_id, ct.driver_id
      FROM eligible_races er
      CROSS JOIN current_team ct
      WHERE er.race_date IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM public.transfers t
           WHERE t.manager_id = mgr.id
             AND t.new_driver_id = ct.driver_id
             AND t.created_at > er.race_date
         )
      UNION
      SELECT er.race_id, t.old_driver_id AS driver_id
      FROM eligible_races er
      JOIN public.transfers t ON t.manager_id = mgr.id
      WHERE er.race_date IS NOT NULL
        AND t.created_at > er.race_date
        AND NOT EXISTS (
          -- the old_driver_id was later transferred back out before the race? handle chain by checking no later transfer (still after race) where new_driver_id = this old_driver_id
          SELECT 1 FROM public.transfers t2
          WHERE t2.manager_id = mgr.id
            AND t2.created_at > er.race_date
            AND t2.created_at < t.created_at
            AND t2.old_driver_id = t.old_driver_id
        )
    )
    SELECT COALESCE(SUM(rr.points), 0) INTO base_points
    FROM public.race_results rr
    JOIN historical_team ht ON ht.race_id = rr.race_id AND ht.driver_id = rr.driver_id;

    -- Captain bonus
    SELECT COALESCE(SUM(rr.points), 0) INTO captain_bonus
    FROM public.captain_selections cs
    JOIN public.races r ON r.id = cs.race_id
    JOIN public.race_results rr ON rr.race_id = cs.race_id AND rr.driver_id = cs.driver_id
    WHERE cs.manager_id = mgr.id
      AND (r.race_date IS NULL OR mgr.created_at <= r.race_date - interval '1 hour');

    -- Prediction bonus: 5 per correct
    SELECT COALESCE(COUNT(*) * 5, 0) INTO prediction_bonus
    FROM public.prediction_answers
    WHERE manager_id = mgr.id AND is_correct = true;

    -- Transfer costs
    SELECT COALESCE(SUM(point_cost), 0) INTO transfer_costs
    FROM public.transfers WHERE manager_id = mgr.id;

    new_total := base_points + captain_bonus + prediction_bonus - transfer_costs;

    UPDATE public.managers SET total_points = new_total WHERE id = mgr.id;
  END LOOP;
END $$;
