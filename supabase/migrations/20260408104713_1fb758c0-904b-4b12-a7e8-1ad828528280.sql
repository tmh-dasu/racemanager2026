DROP POLICY "Authenticated users can create own manager" ON public.managers;
CREATE POLICY "Authenticated users can create own manager"
ON public.managers FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));