DROP POLICY IF EXISTS "Anyone can read published prediction_questions" ON public.prediction_questions;
REVOKE SELECT ON public.prediction_questions FROM anon;
GRANT SELECT ON public.prediction_questions_public TO anon, authenticated;