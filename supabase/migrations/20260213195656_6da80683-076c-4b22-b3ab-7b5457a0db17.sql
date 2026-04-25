
-- ============================================================
-- MÓDULO ÓRDENES DE REPARACIÓN - Migración completa
-- ============================================================

-- ── 1. TABLAS ────────────────────────────────────────────────

-- 1A. repair_orders
CREATE TABLE public.repair_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'abierta',
  estimated_total NUMERIC NOT NULL DEFAULT 0,
  estimated_end_date TIMESTAMPTZ,
  actual_end_date TIMESTAMPTZ,
  observations TEXT NOT NULL DEFAULT '',
  previous_vehicle_status TEXT,
  cancellation_reason TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único parcial: solo una orden activa por vehículo
CREATE UNIQUE INDEX idx_one_active_repair_order
  ON public.repair_orders (vehicle_id)
  WHERE status IN ('abierta','presupuestada','aprobada','en_ejecucion');

-- Trigger updated_at
CREATE TRIGGER update_repair_orders_updated_at
  BEFORE UPDATE ON public.repair_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1B. repair_order_categories
CREATE TABLE public.repair_order_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_order_id UUID NOT NULL,
  category_type TEXT NOT NULL,
  estimated_amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 1C. supplier_invoices
CREATE TABLE public.supplier_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  repair_order_id UUID NOT NULL,
  vehicle_id UUID NOT NULL,
  supplier_id UUID NOT NULL,
  invoice_number TEXT NOT NULL,
  invoice_date TIMESTAMPTZ NOT NULL,
  base_amount NUMERIC NOT NULL,
  tax_type TEXT NOT NULL DEFAULT 'igic',
  tax_rate NUMERIC NOT NULL DEFAULT 7,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  pdf_path TEXT,
  status TEXT NOT NULL DEFAULT 'pendiente',
  cancellation_reason TEXT,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  rectifies_invoice_id UUID,
  linked_expense_id UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Restricción única: no duplicar factura del mismo proveedor
CREATE UNIQUE INDEX idx_unique_supplier_invoice
  ON public.supplier_invoices (supplier_id, invoice_number);

-- Trigger updated_at
CREATE TRIGGER update_supplier_invoices_updated_at
  BEFORE UPDATE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 1D. supplier_payments
CREATE TABLE public.supplier_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_invoice_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  payment_method TEXT NOT NULL,
  bank_account_id UUID,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── 2. RLS ───────────────────────────────────────────────────

ALTER TABLE public.repair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repair_order_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- repair_orders
CREATE POLICY "Repair orders viewable by authenticated"
  ON public.repair_orders FOR SELECT USING (true);
CREATE POLICY "Repair orders insertable by authenticated"
  ON public.repair_orders FOR INSERT WITH CHECK (true);
CREATE POLICY "Repair orders updatable by authenticated"
  ON public.repair_orders FOR UPDATE USING (true);

-- repair_order_categories
CREATE POLICY "Repair categories viewable by authenticated"
  ON public.repair_order_categories FOR SELECT USING (true);
CREATE POLICY "Repair categories insertable by authenticated"
  ON public.repair_order_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Repair categories updatable by authenticated"
  ON public.repair_order_categories FOR UPDATE USING (true);
CREATE POLICY "Repair categories deletable by authenticated"
  ON public.repair_order_categories FOR DELETE USING (true);

-- supplier_invoices (no DELETE)
CREATE POLICY "Supplier invoices viewable by authenticated"
  ON public.supplier_invoices FOR SELECT USING (true);
CREATE POLICY "Supplier invoices insertable by authenticated"
  ON public.supplier_invoices FOR INSERT WITH CHECK (true);
CREATE POLICY "Supplier invoices updatable by authenticated"
  ON public.supplier_invoices FOR UPDATE USING (true);

-- supplier_payments (no UPDATE, no DELETE)
CREATE POLICY "Supplier payments viewable by authenticated"
  ON public.supplier_payments FOR SELECT USING (true);
CREATE POLICY "Supplier payments insertable by authenticated"
  ON public.supplier_payments FOR INSERT WITH CHECK (true);

-- ── 3. CUENTA CONTABLE 400 ──────────────────────────────────

INSERT INTO public.account_chart (code, name, account_type, is_system, parent_code, active)
VALUES ('400', 'Proveedores', 'pasivo', true, NULL, true)
ON CONFLICT (code) DO NOTHING;

-- ── 4. FUNCIONES Y TRIGGERS ─────────────────────────────────

-- 4.1 Recalcular estimated_total de la orden
CREATE OR REPLACE FUNCTION public.fn_repair_order_calc_estimated_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
  v_total numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_order_id := OLD.repair_order_id;
  ELSE
    v_order_id := NEW.repair_order_id;
  END IF;

  SELECT ROUND(COALESCE(SUM(estimated_amount), 0), 2)
    INTO v_total
    FROM public.repair_order_categories
    WHERE repair_order_id = v_order_id;

  UPDATE public.repair_orders
    SET estimated_total = v_total
    WHERE id = v_order_id
      AND estimated_total IS DISTINCT FROM v_total;

  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_order_calc_estimated
  AFTER INSERT OR UPDATE OR DELETE ON public.repair_order_categories
  FOR EACH ROW EXECUTE FUNCTION public.fn_repair_order_calc_estimated_total();

-- 4.2 Estado automático del vehículo
CREATE OR REPLACE FUNCTION public.fn_repair_order_vehicle_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_status text;
BEGIN
  -- Al crear orden activa o cambiar a estado activo
  IF NEW.status IN ('abierta','presupuestada','aprobada','en_ejecucion') THEN
    -- Solo actuar en INSERT o cuando el estado cambia a activo
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status NOT IN ('abierta','presupuestada','aprobada','en_ejecucion')) THEN
      SELECT status INTO v_current_status FROM public.vehicles WHERE id = NEW.vehicle_id;
      NEW.previous_vehicle_status := v_current_status;
      -- No podemos cambiar NEW en AFTER, usar UPDATE directo
    END IF;

    UPDATE public.vehicles
      SET status = 'reparacion', updated_at = now()
      WHERE id = NEW.vehicle_id AND status != 'reparacion';
  END IF;

  -- Al finalizar o cancelar: restaurar estado previo
  IF NEW.status IN ('finalizada', 'cancelada') THEN
    IF TG_OP = 'UPDATE' AND OLD.status IN ('abierta','presupuestada','aprobada','en_ejecucion') THEN
      IF NEW.status = 'finalizada' THEN
        NEW.actual_end_date := COALESCE(NEW.actual_end_date, now());
      END IF;

      UPDATE public.vehicles
        SET status = COALESCE(NEW.previous_vehicle_status, 'disponible')::vehicle_status,
            updated_at = now()
        WHERE id = NEW.vehicle_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_order_vehicle_status
  BEFORE INSERT OR UPDATE ON public.repair_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_repair_order_vehicle_status();

-- 4.3 Validar cierre de orden
CREATE OR REPLACE FUNCTION public.fn_repair_order_validate_close()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_has_valid_invoice boolean;
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;

  IF NEW.status = 'finalizada' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.supplier_invoices
      WHERE repair_order_id = NEW.id
        AND status != 'anulada'
        AND total_amount > 0
        AND pdf_path IS NOT NULL
    ) INTO v_has_valid_invoice;

    IF NOT v_has_valid_invoice THEN
      RAISE EXCEPTION 'No se puede finalizar la orden sin una factura válida (con importe > 0 y PDF adjunto)';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_order_validate_close
  BEFORE UPDATE ON public.repair_orders
  FOR EACH ROW EXECUTE FUNCTION public.fn_repair_order_validate_close();

-- 4.4 Cálculo fiscal de factura proveedor
CREATE OR REPLACE FUNCTION public.fn_supplier_invoice_tax_calc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF COALESCE(NEW.base_amount, 0) > 0 AND COALESCE(NEW.tax_rate, 0) > 0 THEN
    NEW.tax_amount := ROUND(NEW.base_amount * NEW.tax_rate / 100, 2);
    NEW.total_amount := ROUND(NEW.base_amount + NEW.tax_amount, 2);
  ELSIF COALESCE(NEW.base_amount, 0) > 0 THEN
    NEW.tax_amount := 0;
    NEW.total_amount := ROUND(NEW.base_amount, 2);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_supplier_invoice_tax_calc
  BEFORE INSERT OR UPDATE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_supplier_invoice_tax_calc();

-- 4.5 Validar coherencia factura-orden
CREATE OR REPLACE FUNCTION public.fn_supplier_invoice_validate_coherence()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_order record;
BEGIN
  SELECT vehicle_id, supplier_id INTO v_order
    FROM public.repair_orders WHERE id = NEW.repair_order_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Orden de reparación no encontrada: %', NEW.repair_order_id;
  END IF;

  IF v_order.supplier_id != NEW.supplier_id THEN
    RAISE EXCEPTION 'El proveedor de la factura no coincide con el de la orden de reparación';
  END IF;

  IF v_order.vehicle_id != NEW.vehicle_id THEN
    RAISE EXCEPTION 'El vehículo de la factura no coincide con el de la orden de reparación';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_supplier_invoice_validate_coherence
  BEFORE INSERT ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_supplier_invoice_validate_coherence();

-- 4.6 Generar gasto automático al registrar factura
CREATE OR REPLACE FUNCTION public.fn_supplier_invoice_generate_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_expense_id uuid;
  v_supplier_name text;
BEGIN
  IF NEW.status = 'anulada' THEN RETURN NEW; END IF;

  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = NEW.supplier_id;

  INSERT INTO public.expenses (
    vehicle_id, date, amount, base_amount, tax_type, tax_rate, tax_amount,
    description, supplier_id, supplier_name, invoice_number,
    expense_category, is_system_generated, source,
    created_by, updated_by
  ) VALUES (
    NEW.vehicle_id, NEW.invoice_date, NEW.total_amount,
    NEW.base_amount, NEW.tax_type, NEW.tax_rate, NEW.tax_amount,
    'Factura taller: ' || COALESCE(v_supplier_name, '') || ' - ' || NEW.invoice_number,
    NEW.supplier_id, v_supplier_name, NEW.invoice_number,
    'mecanica', true, 'supplier_invoice',
    NEW.created_by, NEW.created_by
  ) RETURNING id INTO v_expense_id;

  UPDATE public.supplier_invoices
    SET linked_expense_id = v_expense_id
    WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_supplier_invoice_generate_expense
  AFTER INSERT ON public.supplier_invoices
  FOR EACH ROW
  WHEN (NEW.status != 'anulada')
  EXECUTE FUNCTION public.fn_supplier_invoice_generate_expense();

-- 4.7 Inmutabilidad financiera de facturas con pagos
CREATE OR REPLACE FUNCTION public.fn_supplier_invoice_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_has_payments boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_payments WHERE supplier_invoice_id = OLD.id
  ) INTO v_has_payments;

  IF v_has_payments THEN
    IF OLD.base_amount IS DISTINCT FROM NEW.base_amount
       OR OLD.tax_type IS DISTINCT FROM NEW.tax_type
       OR OLD.tax_rate IS DISTINCT FROM NEW.tax_rate
       OR OLD.tax_amount IS DISTINCT FROM NEW.tax_amount
       OR OLD.total_amount IS DISTINCT FROM NEW.total_amount
       OR OLD.invoice_number IS DISTINCT FROM NEW.invoice_number
       OR OLD.invoice_date IS DISTINCT FROM NEW.invoice_date
       OR OLD.supplier_id IS DISTINCT FROM NEW.supplier_id
       OR OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id
       OR OLD.repair_order_id IS DISTINCT FROM NEW.repair_order_id
    THEN
      RAISE EXCEPTION 'No se pueden modificar los datos financieros de una factura con pagos registrados';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_supplier_invoice_immutability
  BEFORE UPDATE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_supplier_invoice_immutability();

-- 4.8 Actualizar estado factura al registrar pago
CREATE OR REPLACE FUNCTION public.fn_supplier_payment_update_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_total_paid numeric;
  v_invoice_total numeric;
  v_new_status text;
BEGIN
  SELECT ROUND(COALESCE(SUM(amount), 0), 2)
    INTO v_total_paid
    FROM public.supplier_payments
    WHERE supplier_invoice_id = NEW.supplier_invoice_id;

  SELECT total_amount INTO v_invoice_total
    FROM public.supplier_invoices
    WHERE id = NEW.supplier_invoice_id;

  IF v_total_paid <= 0 THEN
    v_new_status := 'pendiente';
  ELSIF v_total_paid < v_invoice_total THEN
    v_new_status := 'parcialmente_pagada';
  ELSE
    v_new_status := 'pagada';
  END IF;

  UPDATE public.supplier_invoices
    SET status = v_new_status
    WHERE id = NEW.supplier_invoice_id
      AND status IS DISTINCT FROM v_new_status;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_supplier_payment_update_status
  AFTER INSERT ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_supplier_payment_update_status();

-- 4.9 Inmutabilidad total de pagos
CREATE OR REPLACE FUNCTION public.fn_supplier_payment_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'No se pueden eliminar pagos a proveedor registrados';
  END IF;
  RAISE EXCEPTION 'No se pueden modificar pagos a proveedor registrados';
END;
$$;

CREATE TRIGGER trg_supplier_payment_immutability
  BEFORE UPDATE OR DELETE ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_supplier_payment_immutability();

-- 4.10 Función invocable: anular factura con reversión
CREATE OR REPLACE FUNCTION public.fn_supplier_invoice_cancel_reverse(
  p_invoice_id uuid,
  p_reason text,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_invoice record;
  v_lines jsonb;
  v_desc text;
  v_cash_account text;
  v_supplier_name text;
BEGIN
  SELECT * INTO v_invoice FROM public.supplier_invoices WHERE id = p_invoice_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Factura de proveedor no encontrada';
  END IF;

  IF v_invoice.status = 'anulada' THEN
    RAISE EXCEPTION 'La factura ya está anulada';
  END IF;

  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = v_invoice.supplier_id;

  -- 1. Marcar factura como anulada
  UPDATE public.supplier_invoices
    SET status = 'anulada',
        cancellation_reason = p_reason,
        cancelled_by = p_user_id,
        cancelled_at = now()
    WHERE id = p_invoice_id;

  -- 2. Anular gasto vinculado (marcar amount = 0 para que recalc funcione)
  IF v_invoice.linked_expense_id IS NOT NULL THEN
    DELETE FROM public.expenses WHERE id = v_invoice.linked_expense_id;
  END IF;

  -- 3. Asiento contable inverso (Debe 400 / Haber 620)
  v_desc := 'Anulación factura proveedor: ' || COALESCE(v_supplier_name, '') || ' - ' || v_invoice.invoice_number;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', '400', 'description', v_desc, 'debit', ROUND(v_invoice.total_amount, 2), 'credit', 0),
    jsonb_build_object('account_code', '620', 'description', v_desc, 'debit', 0, 'credit', ROUND(v_invoice.total_amount, 2))
  );

  PERFORM fn_create_journal_entry(
    now(),
    v_desc,
    'supplier_invoice',
    p_invoice_id,
    p_user_id,
    v_lines,
    'adjustment'
  );
END;
$$;

-- ── 5. INTEGRACIÓN CONTABLE ─────────────────────────────────

-- 5.1 Asiento al registrar factura proveedor
CREATE OR REPLACE FUNCTION public.fn_journal_entry_from_supplier_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_desc text;
  v_lines jsonb;
  v_supplier_name text;
BEGIN
  IF NEW.status = 'anulada' THEN RETURN NEW; END IF;

  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = NEW.supplier_id;

  v_desc := 'Factura proveedor: ' || COALESCE(v_supplier_name, '') || ' - ' || NEW.invoice_number;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', '620', 'description', v_desc, 'debit', ROUND(NEW.total_amount, 2), 'credit', 0),
    jsonb_build_object('account_code', '400', 'description', v_desc, 'debit', 0, 'credit', ROUND(NEW.total_amount, 2))
  );

  PERFORM fn_create_journal_entry(
    NEW.invoice_date,
    v_desc,
    'supplier_invoice',
    NEW.id,
    NEW.created_by,
    v_lines
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_entry_from_supplier_invoice
  AFTER INSERT ON public.supplier_invoices
  FOR EACH ROW
  WHEN (NEW.status != 'anulada')
  EXECUTE FUNCTION public.fn_journal_entry_from_supplier_invoice();

-- 5.2 Asiento al registrar pago a proveedor
CREATE OR REPLACE FUNCTION public.fn_journal_entry_from_supplier_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cash_account text;
  v_desc text;
  v_lines jsonb;
  v_invoice record;
  v_supplier_name text;
BEGIN
  SELECT * INTO v_invoice FROM public.supplier_invoices WHERE id = NEW.supplier_invoice_id;
  SELECT name INTO v_supplier_name FROM public.suppliers WHERE id = v_invoice.supplier_id;

  IF NEW.payment_method IN ('efectivo', 'tarjeta') THEN
    v_cash_account := '570';
  ELSIF NEW.payment_method IN ('transferencia', 'financiado') THEN
    v_cash_account := '572';
  ELSE
    v_cash_account := '570';
  END IF;

  v_desc := 'Pago a proveedor: ' || COALESCE(v_supplier_name, '') || ' - ' || v_invoice.invoice_number;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', '400', 'description', v_desc, 'debit', ROUND(NEW.amount, 2), 'credit', 0),
    jsonb_build_object('account_code', v_cash_account, 'description', v_desc, 'debit', 0, 'credit', ROUND(NEW.amount, 2))
  );

  PERFORM fn_create_journal_entry(
    NEW.payment_date,
    v_desc,
    'supplier_payment',
    NEW.id,
    NEW.created_by,
    v_lines
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_entry_from_supplier_payment
  AFTER INSERT ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_journal_entry_from_supplier_payment();

-- ── 6. AUDITORÍA ─────────────────────────────────────────────

-- Actualizar audit_trigger_func para incluir las 4 nuevas tablas
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_id uuid;
  v_summary text;
  v_actor_name text;
  v_entity_type text;
  v_record jsonb;
  v_old jsonb;
BEGIN
  -- Get actor name
  BEGIN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_actor_name := NULL;
  END;

  -- Map table name to entity_type
  CASE TG_TABLE_NAME
    WHEN 'vehicles' THEN v_entity_type := 'vehiculo';
    WHEN 'expenses' THEN v_entity_type := 'gasto';
    WHEN 'documents' THEN v_entity_type := 'documento';
    WHEN 'invoices' THEN v_entity_type := 'factura';
    WHEN 'payments' THEN v_entity_type := 'cobro';
    WHEN 'buyers' THEN v_entity_type := 'cliente';
    WHEN 'reservations' THEN v_entity_type := 'reserva';
    WHEN 'notes' THEN v_entity_type := 'nota';
    WHEN 'after_sale_tickets' THEN v_entity_type := 'postventa';
    WHEN 'proposals' THEN v_entity_type := 'propuesta';
    WHEN 'sales' THEN v_entity_type := 'venta';
    WHEN 'repair_orders' THEN v_entity_type := 'orden_reparacion';
    WHEN 'repair_order_categories' THEN v_entity_type := 'categoria_reparacion';
    WHEN 'supplier_invoices' THEN v_entity_type := 'factura_proveedor';
    WHEN 'supplier_payments' THEN v_entity_type := 'pago_proveedor';
    ELSE v_entity_type := TG_TABLE_NAME;
  END CASE;

  -- Extract vehicle_id and build summary
  IF TG_OP = 'DELETE' THEN
    v_record := to_jsonb(OLD);
    v_old := v_record;
    v_vehicle_id := CASE
      WHEN TG_TABLE_NAME = 'vehicles' THEN OLD.id
      WHEN v_record ? 'vehicle_id' THEN (v_record->>'vehicle_id')::uuid
      ELSE NULL
    END;

    CASE TG_TABLE_NAME
      WHEN 'vehicles' THEN v_summary := 'Vehículo eliminado: ' || COALESCE(v_record->>'brand', '') || ' ' || COALESCE(v_record->>'model', '') || ' ' || COALESCE(v_record->>'plate', '');
      WHEN 'expenses' THEN v_summary := 'Gasto eliminado: ' || COALESCE(v_record->>'description', '') || ' ' || COALESCE(v_record->>'amount', '0') || '€';
      WHEN 'documents' THEN v_summary := 'Documento eliminado: ' || COALESCE(v_record->>'category', '') || ' - ' || COALESCE(v_record->>'filename', '');
      WHEN 'notes' THEN v_summary := 'Nota eliminada';
      WHEN 'proposals' THEN v_summary := 'Propuesta eliminada: ' || COALESCE(v_record->>'buyer_name', '');
      WHEN 'repair_order_categories' THEN v_summary := 'Categoría eliminada: ' || COALESCE(v_record->>'category_type', '');
      ELSE v_summary := 'Registro eliminado en ' || TG_TABLE_NAME;
    END CASE;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, v_old, v_vehicle_id, v_summary, v_actor_name, v_entity_type);
    RETURN OLD;

  ELSIF TG_OP = 'INSERT' THEN
    v_record := to_jsonb(NEW);
    v_vehicle_id := CASE
      WHEN TG_TABLE_NAME = 'vehicles' THEN NEW.id
      WHEN v_record ? 'vehicle_id' THEN (v_record->>'vehicle_id')::uuid
      ELSE NULL
    END;

    CASE TG_TABLE_NAME
      WHEN 'vehicles' THEN v_summary := 'Vehículo creado: ' || COALESCE(v_record->>'brand', '') || ' ' || COALESCE(v_record->>'model', '') || ' ' || COALESCE(v_record->>'plate', '');
      WHEN 'expenses' THEN v_summary := 'Gasto añadido: ' || COALESCE(v_record->>'description', '') || ' ' || COALESCE(v_record->>'amount', '0') || '€';
      WHEN 'documents' THEN v_summary := 'Documento subido: ' || COALESCE(v_record->>'category', '');
      WHEN 'notes' THEN v_summary := 'Nota añadida';
      WHEN 'after_sale_tickets' THEN v_summary := 'Ticket postventa creado: ' || COALESCE(v_record->>'task_description', '');
      WHEN 'buyers' THEN v_summary := 'Cliente creado: ' || COALESCE(v_record->>'name', '');
      WHEN 'proposals' THEN v_summary := 'Propuesta creada: ' || COALESCE(v_record->>'buyer_name', '') || ' ' || COALESCE(v_record->>'total_amount', '0') || '€';
      WHEN 'invoices' THEN v_summary := 'Factura creada: ' || COALESCE(v_record->>'buyer_name', '') || ' ' || COALESCE(v_record->>'total_amount', '0') || '€';
      WHEN 'payments' THEN v_summary := 'Cobro registrado: ' || COALESCE(v_record->>'amount', '0') || '€';
      WHEN 'reservations' THEN v_summary := 'Reserva creada: ' || COALESCE(v_record->>'reservation_amount', '0') || '€';
      WHEN 'sales' THEN v_summary := 'Venta registrada: ' || COALESCE(v_record->>'total_amount', '0') || '€';
      WHEN 'repair_orders' THEN v_summary := 'Orden de reparación creada';
      WHEN 'repair_order_categories' THEN v_summary := 'Categoría añadida: ' || COALESCE(v_record->>'category_type', '') || ' ' || COALESCE(v_record->>'estimated_amount', '0') || '€';
      WHEN 'supplier_invoices' THEN v_summary := 'Factura proveedor registrada: ' || COALESCE(v_record->>'invoice_number', '') || ' ' || COALESCE(v_record->>'total_amount', '0') || '€';
      WHEN 'supplier_payments' THEN v_summary := 'Pago a proveedor: ' || COALESCE(v_record->>'amount', '0') || '€';
      ELSE v_summary := 'Registro creado en ' || TG_TABLE_NAME;
    END CASE;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, v_record, v_vehicle_id, v_summary, v_actor_name, v_entity_type);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_record := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    v_vehicle_id := CASE
      WHEN TG_TABLE_NAME = 'vehicles' THEN NEW.id
      WHEN v_record ? 'vehicle_id' THEN (v_record->>'vehicle_id')::uuid
      ELSE NULL
    END;

    IF TG_TABLE_NAME = 'vehicles' THEN
      IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
        v_summary := 'Estado cambiado de ' || COALESCE(v_old->>'status', '?') || ' a ' || COALESCE(v_record->>'status', '?');
      ELSIF (v_old->>'pvp_base') IS DISTINCT FROM (v_record->>'pvp_base') THEN
        v_summary := 'PVP cambiado de ' || COALESCE(v_old->>'pvp_base', '0') || '€ a ' || COALESCE(v_record->>'pvp_base', '0') || '€';
      ELSIF (v_old->>'purchase_price') IS DISTINCT FROM (v_record->>'purchase_price') THEN
        v_summary := 'Precio compra cambiado de ' || COALESCE(v_old->>'purchase_price', '0') || '€ a ' || COALESCE(v_record->>'purchase_price', '0') || '€';
      ELSE
        v_summary := 'Vehículo editado: ' || COALESCE(v_record->>'brand', '') || ' ' || COALESCE(v_record->>'model', '');
      END IF;
    ELSIF TG_TABLE_NAME = 'expenses' THEN
      v_summary := 'Gasto editado: ' || COALESCE(v_record->>'description', '') || ' ' || COALESCE(v_record->>'amount', '0') || '€';
    ELSIF TG_TABLE_NAME = 'invoices' THEN
      IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
        v_summary := 'Factura ' || COALESCE(v_record->>'full_number', 'borrador') || ': estado cambiado a ' || COALESCE(v_record->>'status', '');
      ELSIF (v_old->>'payment_status') IS DISTINCT FROM (v_record->>'payment_status') THEN
        v_summary := 'Factura ' || COALESCE(v_record->>'full_number', 'borrador') || ': pago ' || COALESCE(v_record->>'payment_status', '');
      ELSE
        v_summary := 'Factura editada: ' || COALESCE(v_record->>'full_number', 'borrador');
      END IF;
    ELSIF TG_TABLE_NAME = 'after_sale_tickets' THEN
      IF (v_old->>'validation_status') IS DISTINCT FROM (v_record->>'validation_status') THEN
        v_summary := 'Ticket postventa ' || COALESCE(v_record->>'validation_status', '');
      ELSE
        v_summary := 'Ticket postventa editado';
      END IF;
    ELSIF TG_TABLE_NAME = 'buyers' THEN
      v_summary := 'Cliente editado: ' || COALESCE(v_record->>'name', '');
    ELSIF TG_TABLE_NAME = 'reservations' THEN
      IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
        v_summary := 'Reserva: estado cambiado a ' || COALESCE(v_record->>'status', '');
      ELSE
        v_summary := 'Reserva editada';
      END IF;
    ELSIF TG_TABLE_NAME = 'repair_orders' THEN
      IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
        v_summary := 'Orden reparación: estado cambiado de ' || COALESCE(v_old->>'status', '?') || ' a ' || COALESCE(v_record->>'status', '?');
      ELSE
        v_summary := 'Orden reparación editada';
      END IF;
    ELSIF TG_TABLE_NAME = 'supplier_invoices' THEN
      IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
        v_summary := 'Factura proveedor ' || COALESCE(v_record->>'invoice_number', '') || ': ' || COALESCE(v_record->>'status', '');
      ELSE
        v_summary := 'Factura proveedor editada: ' || COALESCE(v_record->>'invoice_number', '');
      END IF;
    ELSE
      v_summary := 'Registro editado en ' || TG_TABLE_NAME;
    END IF;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, v_old, v_record, v_vehicle_id, v_summary, v_actor_name, v_entity_type);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Crear triggers de auditoría para las 4 nuevas tablas
CREATE TRIGGER audit_repair_orders
  AFTER INSERT OR UPDATE OR DELETE ON public.repair_orders
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_repair_order_categories
  AFTER INSERT OR UPDATE OR DELETE ON public.repair_order_categories
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_supplier_invoices
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_supplier_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.supplier_payments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
