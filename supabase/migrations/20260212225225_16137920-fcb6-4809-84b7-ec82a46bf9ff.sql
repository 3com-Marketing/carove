
-- ══════════════════════════════════════════════════════════
-- FASE G (A): Contabilidad Interna Automática
-- ══════════════════════════════════════════════════════════

-- 1. account_chart
CREATE TABLE public.account_chart (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('activo','pasivo','ingreso','gasto','patrimonio')),
  is_system boolean NOT NULL DEFAULT true,
  parent_code text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.account_chart ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Account chart viewable by authenticated"
  ON public.account_chart FOR SELECT USING (true);
CREATE POLICY "Account chart insertable by admins"
  ON public.account_chart FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "Account chart updatable by admins"
  ON public.account_chart FOR UPDATE
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- Seed system accounts
INSERT INTO public.account_chart (code, name, account_type, is_system) VALUES
  ('430', 'Clientes', 'activo', true),
  ('477', 'IGIC repercutido', 'pasivo', true),
  ('570', 'Caja', 'activo', true),
  ('572', 'Banco', 'activo', true),
  ('620', 'Gastos operativos', 'gasto', true),
  ('629', 'Ajustes y correcciones', 'gasto', true),
  ('700', 'Ventas de vehículos', 'ingreso', true);

-- 2. accounting_periods
CREATE TABLE public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  journal_name text NOT NULL DEFAULT 'Diario General',
  current_number integer NOT NULL DEFAULT 0,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (year, journal_name)
);

ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Periods viewable by authenticated"
  ON public.accounting_periods FOR SELECT USING (true);
CREATE POLICY "Periods insertable by admins"
  ON public.accounting_periods FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "Periods updatable by admins"
  ON public.accounting_periods FOR UPDATE
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 3. journal_entries
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number text NOT NULL,
  period_id uuid NOT NULL REFERENCES public.accounting_periods(id),
  entry_date timestamptz NOT NULL DEFAULT now(),
  description text NOT NULL,
  origin_type text NOT NULL CHECK (origin_type IN ('invoice','payment','operating_expense','manual')),
  origin_id uuid,
  status text NOT NULL DEFAULT 'posted' CHECK (status IN ('posted','adjustment')),
  total_debit numeric NOT NULL DEFAULT 0 CHECK (total_debit >= 0),
  total_credit numeric NOT NULL DEFAULT 0 CHECK (total_credit >= 0),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Anti-duplicate index
CREATE UNIQUE INDEX idx_journal_entries_origin_unique
  ON public.journal_entries (origin_type, origin_id)
  WHERE origin_id IS NOT NULL AND status = 'posted';

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Journal entries viewable by authenticated"
  ON public.journal_entries FOR SELECT USING (true);
CREATE POLICY "Journal entries insertable by authenticated"
  ON public.journal_entries FOR INSERT WITH CHECK (true);

-- Audit
CREATE TRIGGER audit_journal_entries
  AFTER INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 4. journal_entry_lines
CREATE TABLE public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code text NOT NULL,
  description text NOT NULL,
  debit numeric NOT NULL DEFAULT 0 CHECK (debit >= 0),
  credit numeric NOT NULL DEFAULT 0 CHECK (credit >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (debit > 0 OR credit > 0),
  CHECK (NOT (debit > 0 AND credit > 0))
);

ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Lines viewable by authenticated"
  ON public.journal_entry_lines FOR SELECT USING (true);
CREATE POLICY "Lines insertable by authenticated"
  ON public.journal_entry_lines FOR INSERT WITH CHECK (true);

-- ══════════════════════════════════════════════════════════
-- 5. Helper: get or create accounting period
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_get_or_create_accounting_period(p_year integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id
    FROM public.accounting_periods
    WHERE year = p_year AND journal_name = 'Diario General';

  IF NOT FOUND THEN
    INSERT INTO public.accounting_periods (year, journal_name, current_number, is_closed)
    VALUES (p_year, 'Diario General', 0, false)
    ON CONFLICT (year, journal_name) DO NOTHING
    RETURNING id INTO v_id;

    -- Handle race condition
    IF v_id IS NULL THEN
      SELECT id INTO v_id
        FROM public.accounting_periods
        WHERE year = p_year AND journal_name = 'Diario General';
    END IF;
  END IF;

  RETURN v_id;
END;
$$;

-- ══════════════════════════════════════════════════════════
-- 6. Central function: create journal entry (SECURITY DEFINER)
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_create_journal_entry(
  p_entry_date timestamptz,
  p_description text,
  p_origin_type text,
  p_origin_id uuid,
  p_created_by uuid,
  p_lines jsonb,  -- array of {account_code, description, debit, credit}
  p_status text DEFAULT 'posted'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_period_id uuid;
  v_new_number integer;
  v_entry_number text;
  v_total_debit numeric := 0;
  v_total_credit numeric := 0;
  v_entry_id uuid;
  v_existing_id uuid;
  v_line jsonb;
BEGIN
  -- Anti-duplicate check (idempotent)
  IF p_origin_id IS NOT NULL AND p_status = 'posted' THEN
    SELECT id INTO v_existing_id
      FROM public.journal_entries
      WHERE origin_type = p_origin_type AND origin_id = p_origin_id AND status = 'posted';
    IF FOUND THEN
      RETURN v_existing_id;
    END IF;
  END IF;

  -- Calculate year
  v_year := EXTRACT(YEAR FROM p_entry_date)::integer;

  -- Get or create period
  v_period_id := fn_get_or_create_accounting_period(v_year);

  -- Lock period row and increment (no gaps)
  UPDATE public.accounting_periods
    SET current_number = current_number + 1
    WHERE id = v_period_id
    RETURNING current_number INTO v_new_number;

  -- Generate entry number: D-YYYY-NNNNNN
  v_entry_number := 'D-' || v_year::text || '-' || LPAD(v_new_number::text, 6, '0');

  -- Calculate totals and validate
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    v_total_debit := v_total_debit + ROUND(COALESCE((v_line->>'debit')::numeric, 0), 2);
    v_total_credit := v_total_credit + ROUND(COALESCE((v_line->>'credit')::numeric, 0), 2);
  END LOOP;

  v_total_debit := ROUND(v_total_debit, 2);
  v_total_credit := ROUND(v_total_credit, 2);

  -- Validate Debe = Haber
  IF v_total_debit != v_total_credit THEN
    RAISE EXCEPTION 'Asiento descuadrado: Debe (%) ≠ Haber (%)', v_total_debit, v_total_credit;
  END IF;

  IF v_total_debit = 0 THEN
    RAISE EXCEPTION 'Asiento vacío: total = 0';
  END IF;

  -- Insert header
  INSERT INTO public.journal_entries (
    entry_number, period_id, entry_date, description,
    origin_type, origin_id, status,
    total_debit, total_credit, created_by
  ) VALUES (
    v_entry_number, v_period_id, p_entry_date, p_description,
    p_origin_type, p_origin_id, p_status,
    v_total_debit, v_total_credit, p_created_by
  ) RETURNING id INTO v_entry_id;

  -- Insert lines
  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines) LOOP
    INSERT INTO public.journal_entry_lines (entry_id, account_code, description, debit, credit)
    VALUES (
      v_entry_id,
      v_line->>'account_code',
      v_line->>'description',
      ROUND(COALESCE((v_line->>'debit')::numeric, 0), 2),
      ROUND(COALESCE((v_line->>'credit')::numeric, 0), 2)
    );
  END LOOP;

  RETURN v_entry_id;
END;
$$;

-- ══════════════════════════════════════════════════════════
-- 7. Trigger: invoice emitted → journal entry
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_journal_entry_from_invoice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desc text;
  v_lines jsonb;
BEGIN
  -- Only when status changes to emitida
  IF OLD.status = NEW.status OR NEW.status != 'emitida' THEN
    RETURN NEW;
  END IF;

  -- Build description
  IF NEW.invoice_type = 'rectificativa' THEN
    v_desc := 'Rectificativa ' || COALESCE(NEW.full_number, 'borrador') || ' - ' || NEW.buyer_name;
  ELSE
    v_desc := 'Factura ' || COALESCE(NEW.full_number, 'borrador') || ' - ' || NEW.buyer_name;
  END IF;

  -- Build lines: Debe 430 / Haber 700 + 477
  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', '430', 'description', 'Cliente: ' || NEW.buyer_name, 'debit', ROUND(NEW.total_amount, 2), 'credit', 0),
    jsonb_build_object('account_code', '700', 'description', 'Venta: ' || COALESCE(NEW.full_number, ''), 'debit', 0, 'credit', ROUND(NEW.base_amount, 2)),
    jsonb_build_object('account_code', '477', 'description', NEW.tax_type || ' ' || NEW.tax_rate || '%', 'debit', 0, 'credit', ROUND(NEW.tax_amount, 2))
  );

  PERFORM fn_create_journal_entry(
    NEW.issue_date,
    v_desc,
    'invoice',
    NEW.id,
    NEW.issued_by,
    v_lines
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_entry_from_invoice
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_journal_entry_from_invoice();

-- ══════════════════════════════════════════════════════════
-- 8. Trigger: payment → journal entry
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_journal_entry_from_payment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash_account text;
  v_desc text;
  v_lines jsonb;
  v_inv_number text;
BEGIN
  -- Determine cash/bank account
  IF NEW.payment_method IN ('efectivo', 'tarjeta') THEN
    v_cash_account := '570';
  ELSIF NEW.payment_method IN ('transferencia', 'financiado') THEN
    v_cash_account := '572';
  ELSE
    v_cash_account := '570';
  END IF;

  -- Build description
  IF NEW.payment_type = 'factura' AND NEW.invoice_id IS NOT NULL THEN
    SELECT COALESCE(full_number, 'Borrador') INTO v_inv_number FROM public.invoices WHERE id = NEW.invoice_id;
    IF NEW.is_refund THEN
      v_desc := 'Devolución factura ' || COALESCE(v_inv_number, '');
    ELSE
      v_desc := 'Cobro factura ' || COALESCE(v_inv_number, '');
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

  -- Build lines
  IF NEW.is_refund THEN
    -- Refund: Debe 430 / Haber Caja
    v_lines := jsonb_build_array(
      jsonb_build_object('account_code', '430', 'description', v_desc, 'debit', ROUND(NEW.amount, 2), 'credit', 0),
      jsonb_build_object('account_code', v_cash_account, 'description', v_desc, 'debit', 0, 'credit', ROUND(NEW.amount, 2))
    );
  ELSE
    -- Normal: Debe Caja / Haber 430
    v_lines := jsonb_build_array(
      jsonb_build_object('account_code', v_cash_account, 'description', v_desc, 'debit', ROUND(NEW.amount, 2), 'credit', 0),
      jsonb_build_object('account_code', '430', 'description', v_desc, 'debit', 0, 'credit', ROUND(NEW.amount, 2))
    );
  END IF;

  PERFORM fn_create_journal_entry(
    NEW.payment_date,
    v_desc,
    'payment',
    NEW.id,
    NEW.created_by,
    v_lines
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_entry_from_payment
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_journal_entry_from_payment();

-- ══════════════════════════════════════════════════════════
-- 9. Trigger: operating expense → journal entry
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.fn_journal_entry_from_operating_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cash_account text;
  v_desc text;
  v_lines jsonb;
BEGIN
  -- Determine account
  IF NEW.payment_method IN ('efectivo', 'tarjeta') THEN
    v_cash_account := '570';
  ELSIF NEW.payment_method IN ('transferencia', 'financiado') THEN
    v_cash_account := '572';
  ELSE
    v_cash_account := '570';
  END IF;

  v_desc := 'Gasto operativo: ' || NEW.description;

  v_lines := jsonb_build_array(
    jsonb_build_object('account_code', '620', 'description', v_desc, 'debit', ROUND(NEW.amount, 2), 'credit', 0),
    jsonb_build_object('account_code', v_cash_account, 'description', v_desc, 'debit', 0, 'credit', ROUND(NEW.amount, 2))
  );

  PERFORM fn_create_journal_entry(
    NEW.expense_date,
    v_desc,
    'operating_expense',
    NEW.id,
    NEW.created_by,
    v_lines
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_journal_entry_from_operating_expense
  AFTER INSERT ON public.operating_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_journal_entry_from_operating_expense();

-- ══════════════════════════════════════════════════════════
-- 10. Immutability triggers
-- ══════════════════════════════════════════════════════════

-- Journal entries: never editable
CREATE OR REPLACE FUNCTION public.fn_journal_entry_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Los asientos contables son inmutables. Para corregir, cree un asiento de ajuste.';
END;
$$;

CREATE TRIGGER trg_journal_entry_immutability
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_journal_entry_immutability();

-- Journal entry lines: never editable or deletable
CREATE OR REPLACE FUNCTION public.fn_journal_entry_line_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Las líneas de asientos contables son inmutables.';
END;
$$;

CREATE TRIGGER trg_journal_entry_line_immutability
  BEFORE UPDATE OR DELETE ON public.journal_entry_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_journal_entry_line_immutability();
