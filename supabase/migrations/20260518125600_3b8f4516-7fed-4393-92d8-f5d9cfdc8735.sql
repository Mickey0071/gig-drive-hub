
-- inspections additions
ALTER TABLE public.inspections
  ADD COLUMN IF NOT EXISTS inspector_name TEXT,
  ADD COLUMN IF NOT EXISTS job_type TEXT,
  ADD COLUMN IF NOT EXISTS checklist_items JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS ready_to_rent BOOLEAN,
  ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE public.inspections
  DROP CONSTRAINT IF EXISTS inspections_job_type_check;
ALTER TABLE public.inspections
  ADD CONSTRAINT inspections_job_type_check
  CHECK (job_type IS NULL OR job_type IN ('vehicle_return','repossession','new_acquisition','mechanic_run','dmv_reg','inspection'));

ALTER TABLE public.inspections
  DROP CONSTRAINT IF EXISTS inspections_fuel_level_check;
ALTER TABLE public.inspections
  ADD CONSTRAINT inspections_fuel_level_check
  CHECK (fuel_level IS NULL OR fuel_level IN ('full','three_quarter','half','quarter','empty'));

-- tasks additions
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS runner_name TEXT,
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS make TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS plate TEXT,
  ADD COLUMN IF NOT EXISTS priority_level TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE public.tasks
  DROP CONSTRAINT IF EXISTS tasks_priority_level_check;
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_priority_level_check
  CHECK (priority_level IN ('urgent','normal','flexible'));

-- maintenance additions
ALTER TABLE public.maintenance
  ADD COLUMN IF NOT EXISTS source_inspection_id UUID REFERENCES public.inspections(id) ON DELETE SET NULL;

-- vehicles additions
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS has_open_issues BOOLEAN NOT NULL DEFAULT false;

-- Trigger function: auto-create maintenance ticket from inspection
CREATE OR REPLACE FUNCTION public.inspections_auto_maintenance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_keys TEXT[];
  reasons TEXT[];
  existing_open UUID;
BEGIN
  SELECT COALESCE(array_agg(key ORDER BY key), ARRAY[]::TEXT[])
    INTO failed_keys
  FROM jsonb_each_text(COALESCE(NEW.checklist_items, '{}'::jsonb))
  WHERE value = 'fail';

  reasons := failed_keys;
  IF COALESCE(NEW.damage_noted, false) THEN
    reasons := reasons || ARRAY['damage'];
  END IF;
  IF NEW.ready_to_rent IS NOT NULL AND NEW.ready_to_rent = false THEN
    reasons := reasons || ARRAY['flagged needs mechanic'];
  END IF;

  IF array_length(reasons, 1) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO existing_open
  FROM public.maintenance
  WHERE source_inspection_id = NEW.id AND date_completed IS NULL
  LIMIT 1;

  IF existing_open IS NULL THEN
    INSERT INTO public.maintenance (vehicle_id, service_type, date_completed, notes, source_inspection_id)
    VALUES (
      NEW.vehicle_id,
      'Auto-generated from inspection: ' || array_to_string(reasons, ', '),
      NULL,
      NEW.notes,
      NEW.id
    );
  END IF;

  UPDATE public.vehicles SET has_open_issues = true WHERE id = NEW.vehicle_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inspections_after_write ON public.inspections;
CREATE TRIGGER inspections_after_write
AFTER INSERT OR UPDATE ON public.inspections
FOR EACH ROW EXECUTE FUNCTION public.inspections_auto_maintenance();

-- Trigger function: keep vehicles.has_open_issues in sync
CREATE OR REPLACE FUNCTION public.maintenance_sync_vehicle_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_vehicle UUID;
  open_count INTEGER;
BEGIN
  target_vehicle := COALESCE(NEW.vehicle_id, OLD.vehicle_id);
  IF target_vehicle IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  SELECT COUNT(*) INTO open_count
  FROM public.maintenance
  WHERE vehicle_id = target_vehicle AND date_completed IS NULL;
  UPDATE public.vehicles SET has_open_issues = (open_count > 0) WHERE id = target_vehicle;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS maintenance_after_change ON public.maintenance;
CREATE TRIGGER maintenance_after_change
AFTER INSERT OR UPDATE OR DELETE ON public.maintenance
FOR EACH ROW EXECUTE FUNCTION public.maintenance_sync_vehicle_flag();
