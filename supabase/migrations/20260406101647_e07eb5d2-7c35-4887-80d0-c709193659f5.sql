
-- Restrict transfers to authenticated users only
DROP POLICY IF EXISTS "Anyone can view transfers" ON public.transfers;
DROP POLICY IF EXISTS "Authenticated users can view transfers" ON public.transfers;
CREATE POLICY "Authenticated users can view transfers"
  ON public.transfers FOR SELECT TO authenticated
  USING (true);
