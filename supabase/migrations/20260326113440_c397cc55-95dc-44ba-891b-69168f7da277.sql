
-- 1. Create cash_categories table
CREATE TABLE public.cash_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category_type text NOT NULL CHECK (category_type IN ('ingreso', 'gasto')),
  active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cash_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view cash_categories"
  ON public.cash_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Treasury managers can insert cash_categories"
  ON public.cash_categories FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Treasury managers can update cash_categories"
  ON public.cash_categories FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- 2. Seed default categories
INSERT INTO public.cash_categories (name, category_type, sort_order) VALUES
  ('Reserva de vehículo', 'ingreso', 1),
  ('Señal / anticipo', 'ingreso', 2),
  ('Pago parcial vehículo', 'ingreso', 3),
  ('Pago final vehículo', 'ingreso', 4),
  ('Venta de garantía', 'ingreso', 5),
  ('Reparación / taller', 'ingreso', 6),
  ('Venta de accesorios', 'ingreso', 7),
  ('Otros ingresos', 'ingreso', 8),
  ('Lavado de vehículos', 'gasto', 1),
  ('Combustible', 'gasto', 2),
  ('Transporte', 'gasto', 3),
  ('Gestoría', 'gasto', 4),
  ('Material de oficina', 'gasto', 5),
  ('Dietas', 'gasto', 6),
  ('Reparaciones menores', 'gasto', 7),
  ('Otros gastos', 'gasto', 8);

-- 3. Add category_id to cash_session_movements
ALTER TABLE public.cash_session_movements
  ADD COLUMN category_id uuid REFERENCES public.cash_categories(id);
