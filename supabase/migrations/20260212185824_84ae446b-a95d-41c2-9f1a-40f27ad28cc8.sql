
-- =============================================
-- FASE C: Facturación Profesional IGIC
-- =============================================

-- 1. COMPANY_SETTINGS (singleton)
CREATE TABLE public.company_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name text NOT NULL DEFAULT '',
  tax_id text NOT NULL DEFAULT '',
  address text,
  city text,
  postal_code text,
  province text,
  phone text,
  email text,
  legal_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company settings viewable by authenticated"
  ON public.company_settings FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Company settings insertable by admins"
  ON public.company_settings FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Company settings updatable by admins"
  ON public.company_settings FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed singleton
INSERT INTO public.company_settings (company_name, tax_id) VALUES ('', '');

-- 2. INVOICE_SERIES
CREATE TABLE public.invoice_series (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  prefix text NOT NULL,
  current_number integer NOT NULL DEFAULT 0,
  year integer NOT NULL DEFAULT extract(year from now())::integer,
  active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  is_rectificativa boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(name, year)
);

ALTER TABLE public.invoice_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoice series viewable by authenticated"
  ON public.invoice_series FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Invoice series insertable by admins"
  ON public.invoice_series FOR INSERT
  TO authenticated WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Invoice series updatable by admins"
  ON public.invoice_series FOR UPDATE
  TO authenticated USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE TRIGGER update_invoice_series_updated_at
  BEFORE UPDATE ON public.invoice_series
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_invoice_series
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_series
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- Seed series
INSERT INTO public.invoice_series (name, prefix, is_default, is_rectificativa)
  VALUES ('A', 'A', true, false);
INSERT INTO public.invoice_series (name, prefix, is_default, is_rectificativa)
  VALUES ('R', 'R', false, true);

-- 3. INVOICES
CREATE TABLE public.invoices (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_type text NOT NULL DEFAULT 'emitida',
  series_id uuid NOT NULL REFERENCES public.invoice_series(id),
  invoice_number integer,
  full_number text,
  issue_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'borrador',
  sale_id uuid,
  vehicle_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  buyer_name text NOT NULL DEFAULT '',
  buyer_dni text,
  buyer_address text,
  vehicle_plate text NOT NULL DEFAULT '',
  vehicle_vin text DEFAULT '',
  vehicle_brand_model text NOT NULL DEFAULT '',
  base_amount numeric NOT NULL DEFAULT 0,
  tax_type text NOT NULL DEFAULT 'igic',
  tax_rate numeric NOT NULL DEFAULT 7,
  tax_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  rectifies_invoice_id uuid REFERENCES public.invoices(id),
  rectification_type text,
  rectification_reason text,
  hash text,
  hash_algorithm text,
  previous_hash text,
  verifactu_status text,
  verifactu_sent_at timestamptz,
  issued_by uuid NOT NULL,
  issued_by_name text NOT NULL DEFAULT '',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_invoice_type CHECK (invoice_type IN ('emitida', 'rectificativa')),
  CONSTRAINT chk_invoice_status CHECK (status IN ('borrador', 'emitida', 'anulada', 'rectificada'))
);

-- Partial unique index (only for assigned numbers)
CREATE UNIQUE INDEX idx_invoices_series_number
  ON public.invoices(series_id, invoice_number)
  WHERE invoice_number IS NOT NULL;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Invoices viewable by authenticated"
  ON public.invoices FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Invoices insertable by authenticated"
  ON public.invoices FOR INSERT
  TO authenticated WITH CHECK (true);

CREATE POLICY "Invoices updatable by authenticated"
  ON public.invoices FOR UPDATE
  TO authenticated USING (true);

-- NO DELETE policy: invoices are never deleted

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- 4. TRIGGERS & FUNCTIONS

-- 4a. Validate rectificativa on INSERT
CREATE OR REPLACE FUNCTION public.fn_validate_rectificativa()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.invoice_type = 'rectificativa' THEN
    IF NEW.rectifies_invoice_id IS NULL THEN
      RAISE EXCEPTION 'Una factura rectificativa debe referenciar la factura original (rectifies_invoice_id)';
    END IF;
    IF NEW.rectification_type IS NULL THEN
      RAISE EXCEPTION 'Una factura rectificativa debe indicar el tipo de rectificación (rectification_type)';
    END IF;
    IF NEW.rectification_reason IS NULL THEN
      RAISE EXCEPTION 'Una factura rectificativa debe indicar el motivo de rectificación (rectification_reason)';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_rectificativa
  BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_rectificativa();

-- 4b. Status transitions
CREATE OR REPLACE FUNCTION public.fn_invoice_status_transitions()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'borrador' AND NEW.status IN ('emitida', 'anulada') THEN
    RETURN NEW;
  END IF;

  IF OLD.status = 'emitida' AND NEW.status = 'rectificada' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Transición de estado no permitida: % -> %', OLD.status, NEW.status;
END;
$$;

CREATE TRIGGER trg_invoice_status_transitions
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_invoice_status_transitions();

-- 4c. Assign invoice number on emit
CREATE OR REPLACE FUNCTION public.fn_assign_invoice_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_series record;
  v_new_number integer;
BEGIN
  IF OLD.status != 'emitida' AND NEW.status = 'emitida' THEN
    SELECT id, prefix, current_number, year
      INTO v_series
      FROM public.invoice_series
      WHERE id = NEW.series_id
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Serie de facturación no encontrada: %', NEW.series_id;
    END IF;

    v_new_number := v_series.current_number + 1;

    UPDATE public.invoice_series
      SET current_number = v_new_number
      WHERE id = v_series.id;

    NEW.invoice_number := v_new_number;
    NEW.full_number := v_series.prefix || '-' || v_series.year::text || '-' || LPAD(v_new_number::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_invoice_number
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_assign_invoice_number();

-- 4d. Immutability for emitted invoices
CREATE OR REPLACE FUNCTION public.fn_invoice_immutability()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'emitida' THEN
    -- Allow only specific fields to change
    IF OLD.base_amount IS DISTINCT FROM NEW.base_amount
       OR OLD.tax_rate IS DISTINCT FROM NEW.tax_rate
       OR OLD.tax_amount IS DISTINCT FROM NEW.tax_amount
       OR OLD.total_amount IS DISTINCT FROM NEW.total_amount
       OR OLD.issue_date IS DISTINCT FROM NEW.issue_date
       OR OLD.invoice_number IS DISTINCT FROM NEW.invoice_number
       OR OLD.full_number IS DISTINCT FROM NEW.full_number
       OR OLD.series_id IS DISTINCT FROM NEW.series_id
       OR OLD.buyer_id IS DISTINCT FROM NEW.buyer_id
       OR OLD.buyer_name IS DISTINCT FROM NEW.buyer_name
       OR OLD.buyer_dni IS DISTINCT FROM NEW.buyer_dni
       OR OLD.buyer_address IS DISTINCT FROM NEW.buyer_address
       OR OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id
       OR OLD.vehicle_plate IS DISTINCT FROM NEW.vehicle_plate
       OR OLD.vehicle_vin IS DISTINCT FROM NEW.vehicle_vin
       OR OLD.vehicle_brand_model IS DISTINCT FROM NEW.vehicle_brand_model
       OR OLD.tax_type IS DISTINCT FROM NEW.tax_type
       OR OLD.invoice_type IS DISTINCT FROM NEW.invoice_type
       OR OLD.issued_by IS DISTINCT FROM NEW.issued_by
       OR OLD.issued_by_name IS DISTINCT FROM NEW.issued_by_name
    THEN
      RAISE EXCEPTION 'No se pueden modificar los datos fiscales de una factura emitida';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_invoice_immutability
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_invoice_immutability();
