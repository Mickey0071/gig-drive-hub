
ALTER TABLE public.maintenance
  ADD COLUMN IF NOT EXISTS problem_type TEXT,
  ADD COLUMN IF NOT EXISTS estimated_return_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS down_payment NUMERIC;
