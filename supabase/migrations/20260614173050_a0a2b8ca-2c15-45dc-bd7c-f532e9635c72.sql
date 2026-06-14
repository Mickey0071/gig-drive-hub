-- Extend violations for unmatched/match workflow
ALTER TYPE violation_status ADD VALUE IF NOT EXISTS 'unmatched';
ALTER TYPE violation_status ADD VALUE IF NOT EXISTS 'matched';
ALTER TYPE violation_status ADD VALUE IF NOT EXISTS 'not_our_vehicle';

ALTER TABLE public.violations
  ADD COLUMN IF NOT EXISTS plate_text text,
  ADD COLUMN IF NOT EXISTS location text,
  ADD COLUMN IF NOT EXISTS time_issued time,
  ADD COLUMN IF NOT EXISTS rental_id uuid REFERENCES public.rentals(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS raw jsonb;

CREATE INDEX IF NOT EXISTS idx_violations_plate_text ON public.violations (plate_text);
CREATE INDEX IF NOT EXISTS idx_violations_status ON public.violations (status);