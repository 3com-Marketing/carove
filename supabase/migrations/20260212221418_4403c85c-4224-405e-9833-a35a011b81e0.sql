
-- =============================================
-- FASE F: Tesorería Profesional + Conciliación
-- =============================================

-- 1. cash_movements
CREATE TABLE public.cash_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type text NOT NULL,
  movement_reason text NOT NULL DEFAULT 'operativo',
  origin_type text NOT NULL,
  origin_id uuid,
  description text NOT NULL,
  amount numeric NOT NULL,
  movement_date timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL,
  notes text,
  is_system_generated boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_cm_amount CHECK (amount > 0),
  CONSTRAINT chk_cm_type CHECK (movement_type IN ('ingreso', 'gasto')),
  CONSTRAINT chk_cm_reason CHECK (movement_reason IN ('operativo', 'ajuste', 'correccion', 'regularizacion')),
  CONSTRAINT chk_cm_origin CHECK (origin_type IN ('payment', 'operating_expense', 'manual')),
  CONSTRAINT chk_cm_method CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'financiado', 'otro'))
);

CREATE UNIQUE INDEX idx_cm_unique_origin ON public.cash_movements (origin_type, origin_id)
  WHERE origin_id IS NOT NULL AND is_system_generated = true;

ALTER TABLE public.cash_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cash movements viewable by authenticated" ON public.cash_movements FOR SELECT USING (true);
CREATE POLICY "Cash movements insertable by authenticated" ON public.cash_movements FOR INSERT WITH CHECK (true);
CREATE POLICY "Cash movements updatable by authenticated" ON public.cash_movements FOR UPDATE USING (true);

-- 2. operating_expenses
CREATE TABLE public.operating_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  expense_date timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_oe_amount CHECK (amount > 0),
  CONSTRAINT chk_oe_category CHECK (category IN ('alquiler', 'nominas', 'suministros', 'gestoria', 'marketing', 'otros')),
  CONSTRAINT chk_oe_method CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'financiado', 'otro'))
);

ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Op expenses viewable by authenticated" ON public.operating_expenses FOR SELECT USING (true);
CREATE POLICY "Op expenses insertable by admins" ON public.operating_expenses FOR INSERT WITH CHECK (has_role(auth.uid(), 'administrador'));
CREATE POLICY "Op expenses updatable by admins" ON public.operating_expenses FOR UPDATE USING (has_role(auth.uid(), 'administrador'));

-- 3. bank_accounts
CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name text NOT NULL,
  account_name text NOT NULL,
  iban text NOT NULL,
  initial_balance numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank accounts viewable by authenticated" ON public.bank_accounts FOR SELECT USING (true);
CREATE POLICY "Bank accounts insertable by admins" ON public.bank_accounts FOR INSERT WITH CHECK (has_role(auth.uid(), 'administrador'));
CREATE POLICY "Bank accounts updatable by admins" ON public.bank_accounts FOR UPDATE USING (has_role(auth.uid(), 'administrador'));

-- 4. bank_movements
CREATE TABLE public.bank_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_account_id uuid NOT NULL REFERENCES public.bank_accounts(id),
  movement_date timestamptz NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  movement_type text NOT NULL,
  is_reconciled boolean NOT NULL DEFAULT false,
  reconciled_cash_movement_id uuid REFERENCES public.cash_movements(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_bm_amount CHECK (amount > 0),
  CONSTRAINT chk_bm_type CHECK (movement_type IN ('ingreso', 'gasto'))
);

ALTER TABLE public.bank_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bank movements viewable by authenticated" ON public.bank_movements FOR SELECT USING (true);
CREATE POLICY "Bank movements insertable by admins" ON public.bank_movements FOR INSERT WITH CHECK (has_role(auth.uid(), 'administrador'));
CREATE POLICY "Bank movements updatable by admins" ON public.bank_movements FOR UPDATE USING (has_role(auth.uid(), 'administrador'));

-- 5. Triggers: timestamps + audit on all 4 tables
CREATE TRIGGER update_cash_movements_updated_at BEFORE UPDATE ON public.cash_movements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_operating_expenses_updated_at BEFORE UPDATE ON public.operating_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_cash_movements AFTER INSERT OR UPDATE OR DELETE ON public.cash_movements FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_operating_expenses AFTER INSERT OR UPDATE OR DELETE ON public.operating_expenses FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_bank_accounts AFTER INSERT OR UPDATE OR DELETE ON public.bank_accounts FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();
CREATE TRIGGER audit_bank_movements AFTER INSERT OR UPDATE OR DELETE ON public.bank_movements FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- 6. fn_cash_movement_from_payment
CREATE OR REPLACE FUNCTION public.fn_cash_movement_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_type text;
  v_desc text;
  v_inv_number text;
BEGIN
  IF NEW.is_refund THEN
    v_type := 'gasto';
  ELSE
    v_type := 'ingreso';
  END IF;

  -- Build description
  IF NEW.payment_type = 'factura' AND NEW.invoice_id IS NOT NULL THEN
    SELECT COALESCE(full_number, 'Borrador') INTO v_inv_number FROM public.invoices WHERE id = NEW.invoice_id;
    IF NEW.is_refund THEN
      v_desc := 'Devolución factura ' || COALESCE(v_inv_number, NEW.invoice_id::text);
    ELSE
      v_desc := 'Cobro factura ' || COALESCE(v_inv_number, NEW.invoice_id::text);
    END IF;
  ELSIF NEW.payment_type = 'reserva' AND NEW.reservation_id IS NOT NULL THEN
    IF NEW.is_refund THEN
      v_desc := 'Devolución señal reserva ' || LEFT(NEW.reservation_id::text, 8);
    ELSE
      v_desc := 'Señal reserva ' || LEFT(NEW.reservation_id::text, 8);
    END IF;
  ELSE
    v_desc := 'Pago registrado';
  END IF;

  INSERT INTO public.cash_movements (
    movement_type, movement_reason, origin_type, origin_id,
    description, amount, movement_date, payment_method,
    is_system_generated, created_by
  ) VALUES (
    v_type, 'operativo', 'payment', NEW.id,
    v_desc, NEW.amount, NEW.payment_date, NEW.payment_method,
    true, NEW.created_by
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cash_movement_from_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION fn_cash_movement_from_payment();

-- 7. fn_cash_movement_from_operating_expense
CREATE OR REPLACE FUNCTION public.fn_cash_movement_from_operating_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.cash_movements (
    movement_type, movement_reason, origin_type, origin_id,
    description, amount, movement_date, payment_method,
    is_system_generated, created_by
  ) VALUES (
    'gasto', 'operativo', 'operating_expense', NEW.id,
    'Gasto operativo: ' || NEW.description, NEW.amount, NEW.expense_date, NEW.payment_method,
    true, NEW.created_by
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cash_movement_from_operating_expense
  AFTER INSERT ON public.operating_expenses
  FOR EACH ROW EXECUTE FUNCTION fn_cash_movement_from_operating_expense();

-- 8. fn_cash_movement_immutability
CREATE OR REPLACE FUNCTION public.fn_cash_movement_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.is_system_generated = true THEN
    -- Only allow notes and updated_at changes
    IF OLD.movement_type IS DISTINCT FROM NEW.movement_type
       OR OLD.movement_reason IS DISTINCT FROM NEW.movement_reason
       OR OLD.origin_type IS DISTINCT FROM NEW.origin_type
       OR OLD.origin_id IS DISTINCT FROM NEW.origin_id
       OR OLD.description IS DISTINCT FROM NEW.description
       OR OLD.amount IS DISTINCT FROM NEW.amount
       OR OLD.movement_date IS DISTINCT FROM NEW.movement_date
       OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
       OR OLD.is_system_generated IS DISTINCT FROM NEW.is_system_generated
       OR OLD.created_by IS DISTINCT FROM NEW.created_by
    THEN
      RAISE EXCEPTION 'No se pueden modificar movimientos generados por el sistema';
    END IF;
  ELSE
    -- Manual: block financial fields
    IF OLD.amount IS DISTINCT FROM NEW.amount
       OR OLD.movement_type IS DISTINCT FROM NEW.movement_type
       OR OLD.movement_reason IS DISTINCT FROM NEW.movement_reason
       OR OLD.origin_type IS DISTINCT FROM NEW.origin_type
       OR OLD.origin_id IS DISTINCT FROM NEW.origin_id
       OR OLD.movement_date IS DISTINCT FROM NEW.movement_date
       OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
    THEN
      RAISE EXCEPTION 'No se pueden modificar los datos financieros de un movimiento manual';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cash_movement_immutability
  BEFORE UPDATE ON public.cash_movements
  FOR EACH ROW EXECUTE FUNCTION fn_cash_movement_immutability();
