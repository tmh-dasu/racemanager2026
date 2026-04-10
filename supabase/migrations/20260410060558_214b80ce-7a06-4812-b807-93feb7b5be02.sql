-- Allow all authenticated users to read all prediction answers
-- This is needed for leaderboard calculations and point breakdowns
CREATE POLICY "Authenticated can read all prediction_answers"
  ON public.prediction_answers
  FOR SELECT
  TO authenticated
  USING (true);