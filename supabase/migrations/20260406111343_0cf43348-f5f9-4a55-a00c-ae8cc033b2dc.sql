
DROP POLICY IF EXISTS "Owner can read own prediction_answers" ON public.prediction_answers;
DROP POLICY IF EXISTS "Admins can read all prediction_answers" ON public.prediction_answers;

CREATE POLICY "Anyone can read prediction_answers"
  ON public.prediction_answers FOR SELECT
  TO public
  USING (true);
