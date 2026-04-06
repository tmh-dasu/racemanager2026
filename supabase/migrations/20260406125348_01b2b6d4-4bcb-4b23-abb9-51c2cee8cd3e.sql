DROP POLICY IF EXISTS "Public can read safe settings" ON public.settings;

CREATE POLICY "Public can read safe settings"
  ON public.settings FOR SELECT
  TO public
  USING (key = ANY (ARRAY['team_registration_open'::text, 'budget_limit'::text, 'transfer_window_open'::text]));