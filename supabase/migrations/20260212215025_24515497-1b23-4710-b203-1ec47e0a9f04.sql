
-- =============================================
-- FASE E: Sistema Profesional de Pagos
-- =============================================

-- 1. New payment_status column on invoices
ALTER TABLE public.invoices ADD COLUMN payment_status text NOT NULL DEFAULT 'pendiente';

-- 2. Create payments table
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_type text NOT NULL,
  invoice_id uuid REFERENCES public.invoices(id),
  reservation_id uuid REFERENCES public.reservations(id),
  vehicle_id uuid NOT NULL,
  buyer_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_date timestamptz NOT NULL DEFAULT now(),
  payment_method text NOT NULL,
  is_refund boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Structural constraints
  CONSTRAINT chk_payment_amount_positive CHECK (amount > 0),
  CONSTRAINT chk_payment_type CHECK (payment_type IN ('factura', 'reserva')),
  CONSTRAINT chk_payment_method CHECK (payment_method IN ('efectivo', 'transferencia', 'tarjeta', 'financiado', 'otro')),
  CONSTRAINT chk_payment_reference CHECK (
    (payment_type = 'factura' AND invoice_id IS NOT NULL AND reservation_id IS NULL)
    OR
    (payment_type = 'reserva' AND reservation_id IS NOT NULL AND invoice_id IS NULL)
  )
);

-- 3. Enable RLS (no UPDATE, no DELETE)
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Payments viewable by authenticated"
  ON public.payments FOR SELECT
  USING (true);

CREATE POLICY "Payments insertable by authenticated"
  ON public.payments FOR INSERT
  WITH CHECK (true);

-- 4. Reuse updated_at trigger
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Reuse audit trigger
CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

-- 6. Immutability trigger for payments
CREATE OR REPLACE FUNCTION public.fn_payment_immutability()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.amount IS DISTINCT FROM NEW.amount
     OR OLD.is_refund IS DISTINCT FROM NEW.is_refund
     OR OLD.payment_type IS DISTINCT FROM NEW.payment_type
     OR OLD.invoice_id IS DISTINCT FROM NEW.invoice_id
     OR OLD.reservation_id IS DISTINCT FROM NEW.reservation_id
     OR OLD.payment_method IS DISTINCT FROM NEW.payment_method
     OR OLD.payment_date IS DISTINCT FROM NEW.payment_date
     OR OLD.vehicle_id IS DISTINCT FROM NEW.vehicle_id
     OR OLD.buyer_id IS DISTINCT FROM NEW.buyer_id
     OR OLD.created_by IS DISTINCT FROM NEW.created_by
  THEN
    RAISE EXCEPTION 'No se pueden modificar los datos financieros de un pago registrado';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_payment_immutability
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_payment_immutability();

-- 7. Auto-update invoice payment_status trigger
CREATE OR REPLACE FUNCTION public.fn_update_invoice_payment_status()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  v_total_paid numeric;
  v_total_refunded numeric;
  v_net_paid numeric;
  v_invoice_total numeric;
  v_new_status text;
BEGIN
  -- Only process invoice payments
  IF NEW.payment_type != 'factura' OR NEW.invoice_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate totals
  SELECT
    COALESCE(SUM(CASE WHEN NOT is_refund THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN is_refund THEN amount ELSE 0 END), 0)
  INTO v_total_paid, v_total_refunded
  FROM public.payments
  WHERE invoice_id = NEW.invoice_id;

  v_net_paid := ROUND(v_total_paid - v_total_refunded, 2);

  -- Get invoice total
  SELECT total_amount INTO v_invoice_total
  FROM public.invoices
  WHERE id = NEW.invoice_id;

  -- Determine status
  IF v_net_paid <= 0 THEN
    v_new_status := 'pendiente';
  ELSIF v_net_paid < v_invoice_total THEN
    v_new_status := 'parcial';
  ELSE
    v_new_status := 'cobrada';
  END IF;

  -- Update invoice
  UPDATE public.invoices
  SET payment_status = v_new_status
  WHERE id = NEW.invoice_id
    AND payment_status IS DISTINCT FROM v_new_status;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_update_invoice_payment_status
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_invoice_payment_status();
