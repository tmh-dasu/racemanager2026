
-- Create a public view that hides correct_answer
CREATE VIEW public.prediction_questions_public
WITH (security_invoker = on) AS
  SELECT id, race_id, question_text, question_type, option_a, option_b, 
         published, prediction_deadline, created_at
  FROM public.prediction_questions;

-- Replace the public SELECT policy with admin-only
DROP POLICY IF EXISTS "Anyone can read prediction_questions" ON public.prediction_questions;

CREATE POLICY "Admins can read prediction_questions"
  ON public.prediction_questions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Allow public to read the safe view
GRANT SELECT ON public.prediction_questions_public TO anon, authenticated;
