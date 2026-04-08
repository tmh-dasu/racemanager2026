DROP POLICY "Owner can insert prediction_answer" ON public.prediction_answers;
CREATE POLICY "Owner can insert prediction_answer"
ON public.prediction_answers FOR INSERT
TO authenticated
WITH CHECK (
  (EXISTS (SELECT 1 FROM managers WHERE managers.id = prediction_answers.manager_id AND managers.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);