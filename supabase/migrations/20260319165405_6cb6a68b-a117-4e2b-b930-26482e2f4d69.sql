
CREATE TABLE public.voucher_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  used_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.voucher_codes ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/manage vouchers (used by edge function)
CREATE POLICY "Service role can manage vouchers"
  ON public.voucher_codes FOR ALL
  TO public
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Admins can read vouchers
CREATE POLICY "Admins can read vouchers"
  ON public.voucher_codes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
