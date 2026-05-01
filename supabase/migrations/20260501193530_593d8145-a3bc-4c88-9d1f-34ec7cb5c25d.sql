UPDATE public.races
SET race_date = '2026-05-09 14:00:00+00',
    captain_deadline = '2026-05-09 13:00:00+00'
WHERE id = 'cb3e666e-05ab-4738-a04b-a6d1a4b08504';

UPDATE public.prediction_questions
SET prediction_deadline = '2026-05-09 13:00:00+00'
WHERE race_id = 'cb3e666e-05ab-4738-a04b-a6d1a4b08504'
  AND prediction_deadline IS NOT NULL;