DROP POLICY "Owner can insert captain_selection" ON public.captain_selections;
CREATE POLICY "Owner can insert captain_selection"
ON public.captain_selections FOR INSERT
TO authenticated
WITH CHECK (
  (EXISTS (SELECT 1 FROM managers WHERE managers.id = captain_selections.manager_id AND managers.user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);