
-- Create sponsors table
CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  tagline text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

-- Anyone can read sponsors
CREATE POLICY "Anyone can read sponsors" ON public.sponsors FOR SELECT TO public USING (true);

-- Admins can manage sponsors
CREATE POLICY "Admins can insert sponsors" ON public.sponsors FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update sponsors" ON public.sponsors FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete sponsors" ON public.sponsors FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Migrate existing sponsor data from settings to new table
INSERT INTO public.sponsors (name, logo_url, website_url, tagline, sort_order)
SELECT 
  (SELECT value FROM public.settings WHERE key = 'sponsor_name'),
  NULLIF((SELECT value FROM public.settings WHERE key = 'sponsor_logo_url'), ''),
  NULLIF((SELECT value FROM public.settings WHERE key = 'sponsor_website_url'), ''),
  NULLIF((SELECT value FROM public.settings WHERE key = 'sponsor_tagline'), ''),
  0
WHERE EXISTS (SELECT 1 FROM public.settings WHERE key = 'sponsor_name' AND value != '');
