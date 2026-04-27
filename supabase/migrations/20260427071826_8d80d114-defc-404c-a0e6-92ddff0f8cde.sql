DROP POLICY IF EXISTS "Public can read answers after deadline" ON public.prediction_answers;

CREATE POLICY "Public can read answers after deadline"
ON public.prediction_answers
FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1
    FROM public.prediction_questions pq
    LEFT JOIN public.races r ON r.id = pq.race_id
    WHERE pq.id = prediction_answers.question_id
      AND (
        (pq.prediction_deadline IS NOT NULL AND now() > pq.prediction_deadline)
        OR (pq.prediction_deadline IS NULL AND r.race_date IS NOT NULL AND now() > (r.race_date - interval '1 hour'))
      )
  )
);