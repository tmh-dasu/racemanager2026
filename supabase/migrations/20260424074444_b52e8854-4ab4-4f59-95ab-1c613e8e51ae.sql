-- Restrict public read access on transfers (strategic game info)
DROP POLICY IF EXISTS "Anyone can read transfers" ON public.transfers;
-- Authenticated-only SELECT policy already exists ("Authenticated users can view transfers")
