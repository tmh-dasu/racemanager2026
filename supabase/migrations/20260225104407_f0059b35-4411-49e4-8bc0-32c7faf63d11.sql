
-- Settings table for global config
CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

INSERT INTO public.settings (key, value) VALUES ('budget_limit', '100');
INSERT INTO public.settings (key, value) VALUES ('transfer_window_open', 'false');
INSERT INTO public.settings (key, value) VALUES ('team_registration_open', 'true');

-- Drivers table
CREATE TABLE public.drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  car_number INTEGER NOT NULL,
  team TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Races table
CREATE TABLE public.races (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  round_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  location TEXT,
  race_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Race results table
CREATE TABLE public.race_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id UUID NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  position INTEGER,
  fastest_lap BOOLEAN NOT NULL DEFAULT false,
  pole_position BOOLEAN NOT NULL DEFAULT false,
  dnf BOOLEAN NOT NULL DEFAULT false,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(race_id, driver_id)
);

-- Managers (fantasy teams)
CREATE TABLE public.managers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  team_name TEXT NOT NULL,
  budget_remaining NUMERIC NOT NULL DEFAULT 100,
  joker_used BOOLEAN NOT NULL DEFAULT false,
  total_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Manager drivers (the 3 picked drivers)
CREATE TABLE public.manager_drivers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(manager_id, driver_id)
);

-- Joker transfer log
CREATE TABLE public.joker_transfers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manager_id UUID NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE,
  old_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  new_driver_id UUID NOT NULL REFERENCES public.drivers(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.race_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manager_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.joker_transfers ENABLE ROW LEVEL SECURITY;

-- Public read policies
CREATE POLICY "Anyone can read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Anyone can read drivers" ON public.drivers FOR SELECT USING (true);
CREATE POLICY "Anyone can read races" ON public.races FOR SELECT USING (true);
CREATE POLICY "Anyone can read race_results" ON public.race_results FOR SELECT USING (true);
CREATE POLICY "Anyone can read managers" ON public.managers FOR SELECT USING (true);
CREATE POLICY "Anyone can read manager_drivers" ON public.manager_drivers FOR SELECT USING (true);
CREATE POLICY "Anyone can read joker_transfers" ON public.joker_transfers FOR SELECT USING (true);

-- Public write policies (no auth - this is a public fantasy game with email-based identification)
CREATE POLICY "Anyone can create a manager" ON public.managers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update managers" ON public.managers FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert manager_drivers" ON public.manager_drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete manager_drivers" ON public.manager_drivers FOR DELETE USING (true);
CREATE POLICY "Anyone can insert joker_transfers" ON public.joker_transfers FOR INSERT WITH CHECK (true);

-- Admin write policies
CREATE POLICY "Anyone can insert settings" ON public.settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update settings" ON public.settings FOR UPDATE USING (true);
CREATE POLICY "Anyone can insert drivers" ON public.drivers FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update drivers" ON public.drivers FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete drivers" ON public.drivers FOR DELETE USING (true);
CREATE POLICY "Anyone can insert races" ON public.races FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update races" ON public.races FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete races" ON public.races FOR DELETE USING (true);
CREATE POLICY "Anyone can insert race_results" ON public.race_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update race_results" ON public.race_results FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete race_results" ON public.race_results FOR DELETE USING (true);
