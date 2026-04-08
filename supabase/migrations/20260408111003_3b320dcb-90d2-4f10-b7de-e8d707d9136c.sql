CREATE POLICY "Admins can update prediction_answers"
ON public.prediction_answers
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));