
CREATE TABLE public.prediction_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  is_duel boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.prediction_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prediction categories"
  ON public.prediction_categories FOR SELECT TO public
  USING (true);

CREATE POLICY "Only admins can insert categories"
  ON public.prediction_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update categories"
  ON public.prediction_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete categories"
  ON public.prediction_categories FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Seed existing categories
INSERT INTO public.prediction_categories (key, label, is_duel, sort_order) VALUES
  ('duel', 'Duel – hvem kvalificerer sig bedst?', true, 1),
  ('point_duel', 'Pointduel – hvem scorer flest point?', true, 2),
  ('yes_no', 'Ja/Nej-spørgsmål', false, 3);
