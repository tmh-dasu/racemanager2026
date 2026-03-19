
-- Admins can insert vouchers
CREATE POLICY "Admins can insert vouchers"
  ON public.voucher_codes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admins can delete vouchers
CREATE POLICY "Admins can delete vouchers"
  ON public.voucher_codes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
