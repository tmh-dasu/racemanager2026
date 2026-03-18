
CREATE POLICY "Anyone can delete managers" ON public.managers FOR DELETE TO public USING (true);
