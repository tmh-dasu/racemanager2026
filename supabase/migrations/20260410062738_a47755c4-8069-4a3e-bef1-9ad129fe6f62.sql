-- Allow public read access to managers (needed for leaderboard via managers_public view)
-- The managers_public view already hides sensitive fields like email
CREATE POLICY "Anyone can read managers"
ON public.managers
FOR SELECT
TO public
USING (true);