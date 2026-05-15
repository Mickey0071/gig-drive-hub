CREATE TYPE public.task_status AS ENUM ('pending', 'done');

CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT,
  status public.task_status NOT NULL DEFAULT 'pending',
  priority INT NOT NULL DEFAULT 0,
  completed_by_name TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated) can view tasks
CREATE POLICY "anyone can view tasks" ON public.tasks
  FOR SELECT TO anon, authenticated USING (true);

-- Public can update only the completion fields (status, completed_at, completed_by_name)
-- We allow UPDATE broadly but use a trigger to prevent changes to other columns when not admin
CREATE POLICY "anyone can mark tasks complete" ON public.tasks
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Only admins can insert or delete
CREATE POLICY "admins insert tasks" ON public.tasks
  FOR INSERT TO authenticated WITH CHECK (is_admin(auth.uid()));
CREATE POLICY "admins delete tasks" ON public.tasks
  FOR DELETE TO authenticated USING (is_admin(auth.uid()));

-- Trigger to lock down which fields non-admins can change
CREATE OR REPLACE FUNCTION public.tasks_guard_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND public.is_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Non-admin / anon: only allow status, completed_at, completed_by_name, updated_at to change
  IF NEW.title IS DISTINCT FROM OLD.title
     OR NEW.notes IS DISTINCT FROM OLD.notes
     OR NEW.priority IS DISTINCT FROM OLD.priority
     OR NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only admins can edit task details';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_guard_update_trg BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.tasks_guard_update();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();