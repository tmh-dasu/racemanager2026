CREATE POLICY "Public can read published prediction_questions"
ON public.prediction_questions
FOR SELECT
TO public
USING (published = true);