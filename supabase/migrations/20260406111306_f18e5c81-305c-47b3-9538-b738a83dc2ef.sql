
-- Drop the public SELECT policy
DROP POLICY IF EXISTS "Anyone can read prediction_answers" ON public.prediction_answers;

-- Only the owner can read their own answers
CREATE POLICY "Owner can read own prediction_answers"
  ON public.prediction_answers FOR SELECT
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
  ON public.prediction_answers FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
