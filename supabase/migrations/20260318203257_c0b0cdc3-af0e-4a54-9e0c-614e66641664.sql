-- 1. Create role enum and user_roles table
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Only service_role can manage user_roles
CREATE POLICY "Service role manages roles" ON public.user_roles
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- 2. Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Drop all overly permissive write policies

-- drivers
DROP POLICY IF EXISTS "Anyone can delete drivers" ON public.drivers;
DROP POLICY IF EXISTS "Anyone can insert drivers" ON public.drivers;
DROP POLICY IF EXISTS "Anyone can update drivers" ON public.drivers;

-- races
DROP POLICY IF EXISTS "Anyone can delete races" ON public.races;
DROP POLICY IF EXISTS "Anyone can insert races" ON public.races;
DROP POLICY IF EXISTS "Anyone can update races" ON public.races;

-- race_results
DROP POLICY IF EXISTS "Anyone can delete race_results" ON public.race_results;
DROP POLICY IF EXISTS "Anyone can insert race_results" ON public.race_results;
DROP POLICY IF EXISTS "Anyone can update race_results" ON public.race_results;

-- settings
DROP POLICY IF EXISTS "Anyone can insert settings" ON public.settings;
DROP POLICY IF EXISTS "Anyone can update settings" ON public.settings;

-- managers
DROP POLICY IF EXISTS "Anyone can create a manager" ON public.managers;
DROP POLICY IF EXISTS "Anyone can update managers" ON public.managers;
DROP POLICY IF EXISTS "Anyone can delete managers" ON public.managers;

-- manager_drivers
DROP POLICY IF EXISTS "Anyone can insert manager_drivers" ON public.manager_drivers;
DROP POLICY IF EXISTS "Anyone can delete manager_drivers" ON public.manager_drivers;

-- joker_transfers
DROP POLICY IF EXISTS "Anyone can insert joker_transfers" ON public.joker_transfers;

-- 4. Create proper RLS policies

-- Admin-only tables: drivers, races, race_results, settings
CREATE POLICY "Admins can insert drivers" ON public.drivers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update drivers" ON public.drivers FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete drivers" ON public.drivers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert races" ON public.races FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update races" ON public.races FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete races" ON public.races FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert race_results" ON public.race_results FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update race_results" ON public.race_results FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete race_results" ON public.race_results FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert settings" ON public.settings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update settings" ON public.settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- managers: authenticated users can create their own, only owner can update/delete, admins can do all
CREATE POLICY "Authenticated users can create own manager" ON public.managers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner can update own manager" ON public.managers FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner or admin can delete manager" ON public.managers FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- manager_drivers: owner of the manager can insert/delete
CREATE POLICY "Owner can insert manager_drivers" ON public.manager_drivers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.managers WHERE id = manager_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Owner can delete manager_drivers" ON public.manager_drivers FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.managers WHERE id = manager_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));

-- joker_transfers: owner can insert
CREATE POLICY "Owner can insert joker_transfers" ON public.joker_transfers FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.managers WHERE id = manager_id AND user_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));