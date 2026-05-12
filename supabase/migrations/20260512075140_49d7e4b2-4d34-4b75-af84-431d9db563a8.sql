CREATE POLICY "Anyone can read transfers"
ON public.transfers
FOR SELECT
TO public
USING (true);