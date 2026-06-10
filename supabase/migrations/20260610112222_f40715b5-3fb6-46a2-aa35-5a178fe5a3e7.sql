CREATE POLICY "Anyone can read published prediction_questions"
ON public.prediction_questions
FOR SELECT
TO anon, authenticated
USING (published = true);