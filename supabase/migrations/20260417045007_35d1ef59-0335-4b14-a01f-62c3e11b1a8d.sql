-- 1. Track verified payments server-side
CREATE TABLE IF NOT EXISTS public.user_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  stripe_session_id text,
  amount integer,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own payment"
  ON public.user_payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role manages payments"
  ON public.user_payments FOR ALL TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Require verified payment to create a manager (team)
DROP POLICY IF EXISTS "Authenticated users can create own manager" ON public.managers;
CREATE POLICY "Authenticated users can create own manager"
  ON public.managers FOR INSERT TO authenticated
  WITH CHECK (
    (auth.uid() = user_id AND EXISTS (
      SELECT 1 FROM public.user_payments p WHERE p.user_id = auth.uid()
    ))
    OR public.has_role(auth.uid(), 'admin')
  );

-- 3. Fix prediction_answers leak: drop overly broad authenticated SELECT
DROP POLICY IF EXISTS "Authenticated can read all prediction_answers" ON public.prediction_answers;
-- Owner-read and post-deadline public-read policies remain.