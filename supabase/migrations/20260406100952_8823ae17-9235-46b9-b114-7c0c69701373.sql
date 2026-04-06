
-- 1. Restrict managers UPDATE: revoke broad UPDATE and grant only safe columns
REVOKE UPDATE ON public.managers FROM authenticated;
GRANT UPDATE (name, team_name, slug) ON public.managers TO authenticated;

-- 2. Restrict settings public read to safe keys only
DROP POLICY IF EXISTS "Anyone can read settings" ON public.settings;
CREATE POLICY "Public can read safe settings"
  ON public.settings FOR SELECT TO public
  USING (key IN ('team_registration_open', 'budget_limit', 'transfer_window_open', 'transfer_cost'));

CREATE POLICY "Admins can read all settings"
  ON public.settings FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 3. Add explicit DENY insert on user_roles for authenticated users
CREATE POLICY "Deny authenticated inserts"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (false);

-- 4. Restrict transfers read to owner and admins
DROP POLICY IF EXISTS "Anyone can read transfers" ON public.transfers;
CREATE POLICY "Owner or admin can read transfers"
  ON public.transfers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.managers
      WHERE managers.id = transfers.manager_id AND managers.user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );
