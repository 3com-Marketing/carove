
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  address text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read branches"
  ON public.branches FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert branches"
  ON public.branches FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can update branches"
  ON public.branches FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admins can delete branches"
  ON public.branches FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE TRIGGER set_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.branches (name) VALUES
  ('Las Palmas'), ('Telde'), ('Arucas'), ('Vecindario');
