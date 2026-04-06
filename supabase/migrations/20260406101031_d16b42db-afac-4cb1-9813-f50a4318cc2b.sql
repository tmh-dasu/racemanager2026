
DROP POLICY IF EXISTS "Owner or admin can read transfers" ON public.transfers;
CREATE POLICY "Anyone can read transfers"
  ON public.transfers FOR SELECT TO public
  USING (true);
