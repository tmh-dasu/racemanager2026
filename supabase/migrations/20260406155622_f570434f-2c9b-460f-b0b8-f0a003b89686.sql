
-- Create a public storage bucket for sponsor logos
INSERT INTO storage.buckets (id, name, public) VALUES ('sponsor-logos', 'sponsor-logos', true);

-- Allow anyone to view sponsor logos
CREATE POLICY "Public can view sponsor logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'sponsor-logos');

-- Allow admins to upload sponsor logos
CREATE POLICY "Admins can upload sponsor logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'sponsor-logos' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to update sponsor logos
CREATE POLICY "Admins can update sponsor logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'sponsor-logos' AND public.has_role(auth.uid(), 'admin'));

-- Allow admins to delete sponsor logos
CREATE POLICY "Admins can delete sponsor logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'sponsor-logos' AND public.has_role(auth.uid(), 'admin'));
