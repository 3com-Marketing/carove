
-- =============================================
-- FASE B: Tabla sales + triggers + RLS + real_sale_price
-- =============================================

-- 1. Crear tabla sales
CREATE TABLE public.sales (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  seller_id uuid NOT NULL,
  seller_name text NOT NULL DEFAULT '',
  sale_date timestamptz NOT NULL DEFAULT now(),
  sale_price numeric NOT NULL CHECK (sale_price > 0),
  discount numeric NOT NULL DEFAULT 0,
  tax_type text NOT NULL DEFAULT 'igic',
  tax_rate numeric NOT NULL DEFAULT 7,
  base_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  invoice_status text NOT NULL DEFAULT 'no_facturada',
  invoice_number text DEFAULT NULL,
  invoice_series text DEFAULT NULL,
  invoice_date timestamptz DEFAULT NULL,
  payment_method text NOT NULL DEFAULT 'contado',
  finance_entity text DEFAULT NULL,
  notes text DEFAULT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Indice unico: un vehiculo solo se vende una vez
CREATE UNIQUE INDEX idx_sales_vehicle_id ON public.sales(vehicle_id);

-- 3. Trigger de calculo fiscal
CREATE OR REPLACE FUNCTION public.fn_sale_tax_calc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.sale_price > 0 AND COALESCE(NEW.tax_rate, 0) >= 0 THEN
    NEW.base_amount := ROUND(NEW.sale_price / (1 + NEW.tax_rate / 100), 2);
    NEW.tax_amount := ROUND(NEW.sale_price - NEW.base_amount, 2);
    NEW.total_amount := NEW.sale_price;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sale_tax_calc
  BEFORE INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sale_tax_calc();

-- 4. Trigger updated_at (reutilizando funcion existente)
CREATE TRIGGER trg_sales_updated_at
  BEFORE UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Trigger auditoria (reutilizando funcion existente)
CREATE TRIGGER trg_sales_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

-- 6. RLS
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales viewable by authenticated"
  ON public.sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Sales insertable by authenticated"
  ON public.sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Sales updatable by authenticated"
  ON public.sales FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Sales deletable by admins"
  ON public.sales FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'));

-- 7. Campo real_sale_price en vehicles
ALTER TABLE public.vehicles ADD COLUMN real_sale_price numeric DEFAULT NULL;
