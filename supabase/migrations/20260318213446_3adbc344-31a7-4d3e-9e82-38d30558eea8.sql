CREATE POLICY "Anyone can read managers via public view"
ON public.managers
FOR SELECT
TO anon
USING (true);