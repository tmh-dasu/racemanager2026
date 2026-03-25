
-- Add withdrawn flag to drivers
ALTER TABLE public.drivers ADD COLUMN IF NOT EXISTS withdrawn boolean NOT NULL DEFAULT false;

-- Add emergency_transfer_used flag to managers (for when driver withdraws and joker already used)
ALTER TABLE public.managers ADD COLUMN IF NOT EXISTS emergency_transfer_used boolean NOT NULL DEFAULT false;
