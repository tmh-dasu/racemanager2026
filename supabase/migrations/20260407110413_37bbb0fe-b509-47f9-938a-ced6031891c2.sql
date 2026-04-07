CREATE TABLE public.prizes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  winner_manager_id uuid REFERENCES public.managers(id) ON DELETE SET NULL,
  drawn_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prizes" ON public.prizes FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert prizes" ON public.prizes FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update prizes" ON public.prizes FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete prizes" ON public.prizes FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));