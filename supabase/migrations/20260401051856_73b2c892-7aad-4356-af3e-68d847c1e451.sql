
-- Create transfers table
CREATE TABLE public.transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE,
  old_driver_id uuid NOT NULL REFERENCES public.drivers(id),
  new_driver_id uuid NOT NULL REFERENCES public.drivers(id),
  point_cost integer NOT NULL DEFAULT 0,
  is_free boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read transfers" ON public.transfers FOR SELECT TO public USING (true);
CREATE POLICY "Owner can insert transfer" ON public.transfers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM managers WHERE managers.id = transfers.manager_id AND managers.user_id = auth.uid())
  OR has_role(auth.uid(), 'admin'::app_role)
);
CREATE POLICY "Admin can delete transfers" ON public.transfers FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
