
-- Replace the blanket public SELECT policy with authenticated-only access
DROP POLICY IF EXISTS "Anyone can read managers" ON public.managers;

CREATE POLICY "Authenticated users can read own manager"
  ON public.managers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
