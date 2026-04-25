
-- Enum for task priority
CREATE TYPE public.task_priority AS ENUM ('baja', 'media', 'alta', 'urgente');

-- Enum for task status
CREATE TYPE public.task_status AS ENUM ('pendiente', 'en_curso', 'completada', 'cancelada');

-- Tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  priority task_priority NOT NULL DEFAULT 'media',
  status task_status NOT NULL DEFAULT 'pendiente',
  due_date timestamptz,
  created_by uuid NOT NULL,
  assigned_to uuid,
  assigned_to_name text DEFAULT '',
  created_by_name text DEFAULT '',
  vehicle_id uuid REFERENCES public.vehicles(id) ON DELETE SET NULL,
  buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL,
  vehicle_label text DEFAULT '',
  buyer_label text DEFAULT '',
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Task comments table
CREATE TABLE public.task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text DEFAULT '',
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks: authenticated users can CRUD
CREATE POLICY "Authenticated users can view all tasks"
  ON public.tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create tasks"
  ON public.tasks FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update tasks"
  ON public.tasks FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Creator or admin can delete tasks"
  ON public.tasks FOR DELETE TO authenticated USING (auth.uid() = created_by);

-- RLS policies for task_comments
CREATE POLICY "Authenticated users can view task comments"
  ON public.task_comments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON public.task_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.task_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Updated_at trigger for tasks
CREATE OR REPLACE FUNCTION public.fn_tasks_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_tasks_updated_at();

-- Auto-set completed_at
CREATE OR REPLACE FUNCTION public.fn_tasks_completed_at()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'completada' AND OLD.status != 'completada' THEN
    NEW.completed_at := now();
  ELSIF NEW.status != 'completada' AND OLD.status = 'completada' THEN
    NEW.completed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_tasks_completed_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.fn_tasks_completed_at();

-- Enable realtime for tasks
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
