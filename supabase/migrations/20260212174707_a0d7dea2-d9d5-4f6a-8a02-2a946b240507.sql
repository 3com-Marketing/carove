
-- =============================================================
-- FASE A: Base Financiera Robusta
-- Precision: ROUND(..., 2) en todos los calculos monetarios
-- Proteccion NULL: COALESCE(campo, 0) en todos los campos monetarios
-- Anti-bucle: guardas de comparacion antes de UPDATE
-- =============================================================

-- 1. ENUM para categorias de gasto (valores cerrados)
CREATE TYPE expense_category AS ENUM (
  'mecanica', 'pintura', 'transporte', 'gestoria',
  'seguro', 'itv', 'garantia', 'limpieza',
  'publicidad', 'otros'
);

-- 2. Nuevas columnas en expenses
ALTER TABLE public.expenses
  ADD COLUMN expense_category expense_category NOT NULL DEFAULT 'otros',
  ADD COLUMN base_amount numeric DEFAULT NULL,
  ADD COLUMN tax_type text DEFAULT 'igic',
  ADD COLUMN tax_rate numeric DEFAULT NULL,
  ADD COLUMN tax_amount numeric DEFAULT 0,
  ADD COLUMN tax_inferred boolean NOT NULL DEFAULT false,
  ADD COLUMN is_system_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN source text DEFAULT NULL;

-- 3. Indice preventivo para rendimiento futuro
CREATE INDEX idx_expenses_vehicle_id ON public.expenses(vehicle_id);

-- =============================================================
-- FUNCION 1: fn_expense_tax_calc
-- BEFORE INSERT/UPDATE en expenses
-- Calcula desglose fiscal y garantiza invariancia:
--   amount = ROUND(base_amount + tax_amount, 2)
-- Precision: 2 decimales en todos los calculos monetarios
-- =============================================================
CREATE OR REPLACE FUNCTION public.fn_expense_tax_calc()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Caso 1: base_amount proporcionado con tax_rate
  IF COALESCE(NEW.base_amount, 0) > 0 AND NEW.tax_rate IS NOT NULL AND NEW.tax_rate > 0 THEN
    NEW.tax_amount := ROUND(NEW.base_amount * NEW.tax_rate / 100, 2);
    NEW.amount := ROUND(NEW.base_amount + NEW.tax_amount, 2);

  -- Caso 2: solo amount proporcionado, deducir base
  ELSIF (NEW.base_amount IS NULL OR NEW.base_amount = 0) AND COALESCE(NEW.amount, 0) > 0 THEN
    IF NEW.tax_rate IS NOT NULL AND NEW.tax_rate > 0 THEN
      NEW.base_amount := ROUND(NEW.amount / (1 + NEW.tax_rate / 100), 2);
      NEW.tax_amount := ROUND(NEW.amount - NEW.base_amount, 2);
    ELSE
      NEW.base_amount := NEW.amount;
      NEW.tax_amount := 0;
    END IF;
  END IF;

  -- Garantizar precision de 2 decimales en amount
  NEW.amount := ROUND(COALESCE(NEW.amount, 0), 2);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expense_tax_calc
  BEFORE INSERT OR UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_expense_tax_calc();

-- =============================================================
-- FUNCION 2: fn_recalc_vehicle_financials
-- AFTER INSERT/UPDATE/DELETE en expenses
-- Recalcula total_expenses, total_cost, net_profit del vehiculo
-- Precision: ROUND(..., 2) en todos los calculos
-- Proteccion NULL: COALESCE en SUM, purchase_price, pvp_base
-- Anti-bucle: solo UPDATE si algun valor cambio
-- =============================================================
CREATE OR REPLACE FUNCTION public.fn_recalc_vehicle_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_id uuid;
  v_total_expenses numeric;
  v_total_cost numeric;
  v_net_profit numeric;
  v_current record;
BEGIN
  -- Determinar vehicle_id segun operacion
  IF TG_OP = 'DELETE' THEN
    v_vehicle_id := OLD.vehicle_id;
  ELSE
    v_vehicle_id := NEW.vehicle_id;
  END IF;

  -- Calcular total de gastos con ROUND y COALESCE para proteccion NULL
  SELECT ROUND(COALESCE(SUM(amount), 0), 2)
    INTO v_total_expenses
    FROM public.expenses
    WHERE vehicle_id = v_vehicle_id;

  -- Obtener valores actuales del vehiculo
  SELECT total_expenses, total_cost, net_profit, purchase_price, pvp_base
    INTO v_current
    FROM public.vehicles
    WHERE id = v_vehicle_id;

  -- Calcular nuevos valores con COALESCE y ROUND (precision 2 decimales)
  v_total_cost := ROUND(COALESCE(v_current.purchase_price, 0) + v_total_expenses, 2);
  v_net_profit := ROUND(COALESCE(v_current.pvp_base, 0) - v_total_cost, 2);

  -- GUARDA ANTI-BUCLE: solo actualizar si algun valor cambio
  IF v_current.total_expenses IS DISTINCT FROM v_total_expenses
     OR v_current.total_cost IS DISTINCT FROM v_total_cost
     OR v_current.net_profit IS DISTINCT FROM v_net_profit THEN

    UPDATE public.vehicles
    SET total_expenses = v_total_expenses,
        total_cost = v_total_cost,
        net_profit = v_net_profit
    WHERE id = v_vehicle_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_expenses_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_recalc_vehicle_financials();

-- =============================================================
-- FUNCION 3: fn_vehicle_recalc_on_price_change
-- BEFORE UPDATE en vehicles
-- Solo actua si purchase_price o pvp_base cambiaron
-- Modifica NEW in-place (sin UPDATE adicional = sin cascada)
-- Precision: ROUND(..., 2), Proteccion: COALESCE
-- =============================================================
CREATE OR REPLACE FUNCTION public.fn_vehicle_recalc_on_price_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- GUARDA: solo recalcular si purchase_price o pvp_base cambiaron
  IF OLD.purchase_price IS DISTINCT FROM NEW.purchase_price
     OR OLD.pvp_base IS DISTINCT FROM NEW.pvp_base THEN

    NEW.total_cost := ROUND(COALESCE(NEW.purchase_price, 0) + COALESCE(NEW.total_expenses, 0), 2);
    NEW.net_profit := ROUND(COALESCE(NEW.pvp_base, 0) - NEW.total_cost, 2);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_vehicle_price_recalc
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_vehicle_recalc_on_price_change();

-- =============================================================
-- FUNCION 4: fn_sync_insurance_expense
-- AFTER UPDATE en vehicles
-- Sincroniza policy_amount como gasto con flags de sistema
-- Anti-bucle: solo actua si policy_amount o insurer_id cambiaron
-- =============================================================
CREATE OR REPLACE FUNCTION public.fn_sync_insurance_expense()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supplier_name text;
BEGIN
  -- GUARDA: solo actuar si policy_amount o insurer_id cambiaron
  IF NOT (OLD.policy_amount IS DISTINCT FROM NEW.policy_amount
          OR OLD.insurer_id IS DISTINCT FROM NEW.insurer_id) THEN
    RETURN NEW;
  END IF;

  -- Si policy_amount es 0 o NULL, eliminar gasto de seguro existente
  IF COALESCE(NEW.policy_amount, 0) = 0 THEN
    DELETE FROM public.expenses
    WHERE vehicle_id = NEW.id
      AND is_system_generated = true
      AND source = 'insurance_sync';
    RETURN NEW;
  END IF;

  -- Obtener nombre de aseguradora
  IF NEW.insurer_id IS NOT NULL THEN
    SELECT name INTO v_supplier_name FROM public.insurers WHERE id = NEW.insurer_id;
  END IF;

  -- UPSERT: crear o actualizar gasto de seguro
  INSERT INTO public.expenses (
    vehicle_id, date, amount, description, supplier_name,
    expense_category, is_system_generated, source,
    created_by, updated_by
  ) VALUES (
    NEW.id, COALESCE(NEW.policy_date, now()),
    ROUND(NEW.policy_amount, 2), 'Póliza de seguro',
    COALESCE(v_supplier_name, 'Seguro'),
    'seguro', true, 'insurance_sync',
    NEW.updated_by, NEW.updated_by
  )
  ON CONFLICT (vehicle_id, source) WHERE is_system_generated = true AND source = 'insurance_sync'
  DO UPDATE SET
    amount = ROUND(EXCLUDED.amount, 2),
    date = EXCLUDED.date,
    supplier_name = EXCLUDED.supplier_name,
    updated_by = EXCLUDED.updated_by,
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Indice parcial unico para el UPSERT de seguro
CREATE UNIQUE INDEX idx_expenses_insurance_sync
  ON public.expenses (vehicle_id, source)
  WHERE is_system_generated = true AND source = 'insurance_sync';

CREATE TRIGGER trg_sync_insurance
  AFTER UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_insurance_expense();

-- =============================================================
-- NORMALIZACION DE DATOS HISTORICOS
-- Marcar gastos existentes con tax_inferred = true
-- No fijar tax_rate = 0 (queda NULL = dato desconocido)
-- =============================================================
UPDATE public.expenses
SET base_amount = amount,
    tax_rate = NULL,
    tax_amount = 0,
    tax_inferred = true
WHERE base_amount IS NULL;

-- Recalculo masivo de totales en vehiculos con ROUND y COALESCE
UPDATE public.vehicles v
SET total_expenses = sub.calc_expenses,
    total_cost = ROUND(COALESCE(v.purchase_price, 0) + sub.calc_expenses, 2),
    net_profit = ROUND(COALESCE(v.pvp_base, 0) - ROUND(COALESCE(v.purchase_price, 0) + sub.calc_expenses, 2), 2)
FROM (
  SELECT vehicle_id, ROUND(COALESCE(SUM(amount), 0), 2) AS calc_expenses
  FROM public.expenses
  GROUP BY vehicle_id
) sub
WHERE v.id = sub.vehicle_id;
