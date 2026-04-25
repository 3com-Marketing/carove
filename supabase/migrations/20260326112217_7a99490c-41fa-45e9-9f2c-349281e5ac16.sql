
-- Add closing fields to cash_sessions
ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS expected_balance numeric(12,2),
  ADD COLUMN IF NOT EXISTS counted_balance numeric(12,2),
  ADD COLUMN IF NOT EXISTS difference numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_tpv numeric(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS closing_notes text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Update movement validation to only allow efectivo/tpv
CREATE OR REPLACE FUNCTION public.fn_validate_cash_session_movement()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.movement_type NOT IN ('ingreso', 'gasto') THEN
    RAISE EXCEPTION 'Tipo de movimiento no válido: %', NEW.movement_type;
  END IF;
  IF NEW.payment_method NOT IN ('efectivo', 'tpv') THEN
    RAISE EXCEPTION 'Método de pago no válido para caja: %. Solo se permiten efectivo y TPV.', NEW.payment_method;
  END IF;
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'El importe debe ser mayor que 0';
  END IF;
  -- Block movements on closed sessions
  IF EXISTS (SELECT 1 FROM public.cash_sessions WHERE id = NEW.session_id AND status = 'cerrada') THEN
    RAISE EXCEPTION 'No se pueden registrar movimientos en una caja cerrada';
  END IF;
  RETURN NEW;
END;
$$;

-- Validation trigger for closing: ensure counted_balance is set
CREATE OR REPLACE FUNCTION public.fn_validate_cash_session_close()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = 'abierta' AND NEW.status = 'cerrada' THEN
    IF NEW.counted_balance IS NULL THEN
      RAISE EXCEPTION 'Debe indicar el saldo contado real para cerrar la caja';
    END IF;
    IF NEW.closed_by IS NULL THEN
      RAISE EXCEPTION 'Debe indicar el usuario de cierre';
    END IF;
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  END IF;
  IF OLD.status = 'cerrada' THEN
    RAISE EXCEPTION 'No se puede modificar una caja ya cerrada';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_cash_session_close ON public.cash_sessions;
CREATE TRIGGER trg_validate_cash_session_close
  BEFORE UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_cash_session_close();
