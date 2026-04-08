ALTER TABLE public.sponsors ADD COLUMN prize_category text NOT NULL DEFAULT 'round';
ALTER TABLE public.sponsors ADD COLUMN prize_placement integer DEFAULT NULL;