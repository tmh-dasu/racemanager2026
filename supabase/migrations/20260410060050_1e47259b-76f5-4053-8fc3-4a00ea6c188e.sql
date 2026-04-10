-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can read prediction_answers" ON public.prediction_answers;

-- Owner can always read their own answers
CREATE POLICY "Owner can read own prediction_answers"
  ON public.prediction_answers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managers
      WHERE managers.id = prediction_answers.manager_id
        AND managers.user_id = auth.uid()
    )
  );

-- Admins can read all answers
CREATE POLICY "Admins can read all prediction_answers"
  ON public.prediction_answers
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can read answers after the prediction deadline has passed
CREATE POLICY "Public can read answers after deadline"
  ON public.prediction_answers
  FOR SELECT
  TO public
  USING (
    EXISTS (
      SELECT 1 FROM public.prediction_questions pq
      WHERE pq.id = prediction_answers.question_id
        AND pq.prediction_deadline IS NOT NULL
        AND now() > pq.prediction_deadline
    )
  );