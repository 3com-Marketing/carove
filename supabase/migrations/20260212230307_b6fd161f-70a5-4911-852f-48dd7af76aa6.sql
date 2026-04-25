
-- 1.1 Nuevas cuentas en account_chart
INSERT INTO public.account_chart (code, name, account_type, is_system) VALUES
  ('120', 'Remanente', 'patrimonio', true),
  ('129', 'Resultado del ejercicio', 'patrimonio', true)
ON CONFLICT (code) DO NOTHING;

-- 1.2 Ampliar CHECK constraint de origin_type en journal_entries
-- First find and drop the existing constraint, then add new one
DO $$
DECLARE
  v_constraint_name text;
BEGIN
  SELECT conname INTO v_constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.journal_entries'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%origin_type%';
  IF v_constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.journal_entries DROP CONSTRAINT ' || quote_ident(v_constraint_name);
  END IF;
END $$;

ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_origin_type_check
  CHECK (origin_type IN ('invoice','payment','operating_expense','manual','closing','opening'));

-- 1.3 fn_close_accounting_year
CREATE OR REPLACE FUNCTION public.fn_close_accounting_year(p_year integer, p_created_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_period_id uuid;
  v_is_closed boolean;
  v_closing_origin_id uuid;
  v_existing_id uuid;
  v_total_ventas numeric := 0;
  v_total_gastos numeric := 0;
  v_resultado numeric;
  v_lines jsonb;
  v_entry_id uuid;
  v_close_date timestamptz;
BEGIN
  -- Deterministic origin_id from year
  v_closing_origin_id := uuid_generate_v5(uuid_ns_url(), 'closing-' || p_year::text);

  -- Validate period exists and is open
  SELECT id, is_closed INTO v_period_id, v_is_closed
    FROM public.accounting_periods
    WHERE year = p_year AND journal_name = 'Diario General'
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe periodo contable para el año %', p_year;
  END IF;

  IF v_is_closed THEN
    RAISE EXCEPTION 'El ejercicio % ya está cerrado', p_year;
  END IF;

  -- Check no duplicate closing
  SELECT id INTO v_existing_id
    FROM public.journal_entries
    WHERE origin_type = 'closing' AND origin_id = v_closing_origin_id AND status = 'posted';
  IF FOUND THEN
    RAISE EXCEPTION 'Ya existe un asiento de cierre para el ejercicio %', p_year;
  END IF;

  -- Calculate income (credit on 700) and expenses (debit on 620) for the year
  SELECT COALESCE(SUM(ROUND(jel.credit, 2)), 0)
    INTO v_total_ventas
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.entry_id
    WHERE jel.account_code = '700'
      AND EXTRACT(YEAR FROM je.entry_date) = p_year
      AND je.origin_type NOT IN ('closing', 'opening');

  SELECT COALESCE(SUM(ROUND(jel.debit, 2)), 0)
    INTO v_total_gastos
    FROM public.journal_entry_lines jel
    JOIN public.journal_entries je ON je.id = jel.entry_id
    WHERE jel.account_code = '620'
      AND EXTRACT(YEAR FROM je.entry_date) = p_year
      AND je.origin_type NOT IN ('closing', 'opening');

  v_resultado := ROUND(v_total_ventas - v_total_gastos, 2);
  v_close_date := (p_year::text || '-12-31')::timestamptz;

  -- Build closing lines
  v_lines := '[]'::jsonb;

  -- Zero out income: Dr 700 / Cr 129
  IF v_total_ventas > 0 THEN
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_code', '700', 'description', 'Cierre ventas ejercicio ' || p_year, 'debit', v_total_ventas, 'credit', 0),
      jsonb_build_object('account_code', '129', 'description', 'Resultado ventas ejercicio ' || p_year, 'debit', 0, 'credit', v_total_ventas)
    );
  END IF;

  -- Zero out expenses: Dr 129 / Cr 620
  IF v_total_gastos > 0 THEN
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_code', '129', 'description', 'Cierre gastos ejercicio ' || p_year, 'debit', v_total_gastos, 'credit', 0),
      jsonb_build_object('account_code', '620', 'description', 'Cierre gastos ejercicio ' || p_year, 'debit', 0, 'credit', v_total_gastos)
    );
  END IF;

  -- Transfer result to 120 (Remanente)
  IF v_resultado > 0 THEN
    -- Profit: Dr 129 / Cr 120
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_code', '129', 'description', 'Traspaso beneficio a remanente', 'debit', v_resultado, 'credit', 0),
      jsonb_build_object('account_code', '120', 'description', 'Remanente ejercicio ' || p_year, 'debit', 0, 'credit', v_resultado)
    );
  ELSIF v_resultado < 0 THEN
    -- Loss: Dr 120 / Cr 129
    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('account_code', '120', 'description', 'Pérdida ejercicio ' || p_year, 'debit', ABS(v_resultado), 'credit', 0),
      jsonb_build_object('account_code', '129', 'description', 'Traspaso pérdida a remanente', 'debit', 0, 'credit', ABS(v_resultado))
    );
  END IF;

  -- If no activity, raise
  IF jsonb_array_length(v_lines) = 0 THEN
    RAISE EXCEPTION 'No hay actividad contable en el ejercicio % para cerrar', p_year;
  END IF;

  -- Create closing entry
  v_entry_id := fn_create_journal_entry(
    v_close_date,
    'Asiento de cierre del ejercicio ' || p_year,
    'closing',
    v_closing_origin_id,
    p_created_by,
    v_lines
  );

  -- Mark period as closed
  UPDATE public.accounting_periods SET is_closed = true WHERE id = v_period_id;

  RETURN v_entry_id;
END;
$function$;

-- 1.4 fn_open_accounting_year
CREATE OR REPLACE FUNCTION public.fn_open_accounting_year(p_year integer, p_created_by uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prev_closed boolean;
  v_opening_origin_id uuid;
  v_existing_id uuid;
  v_lines jsonb := '[]'::jsonb;
  v_rec record;
  v_saldo numeric;
  v_entry_id uuid;
  v_open_date timestamptz;
BEGIN
  -- Deterministic origin_id
  v_opening_origin_id := uuid_generate_v5(uuid_ns_url(), 'opening-' || p_year::text);

  -- Verify previous year is closed
  SELECT is_closed INTO v_prev_closed
    FROM public.accounting_periods
    WHERE year = (p_year - 1) AND journal_name = 'Diario General';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe periodo contable para el año %. Debe cerrar el ejercicio anterior primero.', (p_year - 1);
  END IF;

  IF NOT v_prev_closed THEN
    RAISE EXCEPTION 'El ejercicio % no está cerrado. Debe cerrarlo antes de generar la apertura.', (p_year - 1);
  END IF;

  -- Check no duplicate opening
  SELECT id INTO v_existing_id
    FROM public.journal_entries
    WHERE origin_type = 'opening' AND origin_id = v_opening_origin_id AND status = 'posted';
  IF FOUND THEN
    RAISE EXCEPTION 'Ya existe un asiento de apertura para el ejercicio %', p_year;
  END IF;

  v_open_date := (p_year::text || '-01-01')::timestamptz;

  -- Calculate balances for patrimony/asset/liability accounts from previous year
  FOR v_rec IN
    SELECT ac.code, ac.name,
      ROUND(COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0), 2) AS saldo
    FROM public.account_chart ac
    LEFT JOIN public.journal_entry_lines jel ON jel.account_code = ac.code
    LEFT JOIN public.journal_entries je ON je.id = jel.entry_id
      AND EXTRACT(YEAR FROM je.entry_date) = (p_year - 1)
    WHERE ac.account_type IN ('activo', 'pasivo', 'patrimonio')
      AND ac.active = true
    GROUP BY ac.code, ac.name
    HAVING ROUND(COALESCE(SUM(jel.debit), 0) - COALESCE(SUM(jel.credit), 0), 2) != 0
    ORDER BY ac.code
  LOOP
    IF v_rec.saldo > 0 THEN
      -- Debit balance
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_code', v_rec.code, 'description', 'Apertura ' || v_rec.name, 'debit', v_rec.saldo, 'credit', 0)
      );
    ELSE
      -- Credit balance
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object('account_code', v_rec.code, 'description', 'Apertura ' || v_rec.name, 'debit', 0, 'credit', ABS(v_rec.saldo))
      );
    END IF;
  END LOOP;

  IF jsonb_array_length(v_lines) = 0 THEN
    RAISE EXCEPTION 'No hay saldos patrimoniales del ejercicio % para trasladar', (p_year - 1);
  END IF;

  -- Create opening entry
  v_entry_id := fn_create_journal_entry(
    v_open_date,
    'Asiento de apertura del ejercicio ' || p_year,
    'opening',
    v_opening_origin_id,
    p_created_by,
    v_lines
  );

  RETURN v_entry_id;
END;
$function$;

-- 1.5 Modify fn_create_journal_entry to protect closed periods
CREATE OR REPLACE FUNCTION public.fn_create_journal_entry(p_entry_date timestamp with time zone, p_description text, p_origin_type text, p_origin_id uuid, p_created_by uuid, p_lines jsonb, p_status text DEFAULT 'posted'::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year integer;
  v_period_id uuid;
  v_period_closed boolean;
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

  -- PROTECTION: check if period is closed (allow only closing/opening)
  SELECT is_closed INTO v_period_closed
    FROM public.accounting_periods
    WHERE id = v_period_id;

  IF v_period_closed AND p_origin_type NOT IN ('closing', 'opening') THEN
    RAISE EXCEPTION 'No se pueden registrar asientos en un ejercicio cerrado (%)', v_year;
  END IF;

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
$function$;

-- Enable uuid-ossp if not already
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
