
ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS discrepancy_reason text,
  ADD COLUMN IF NOT EXISTS discrepancy_comment text,
  ADD COLUMN IF NOT EXISTS requires_review boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_status text DEFAULT 'validada';

-- Add check constraint via trigger to avoid immutable constraint issues
CREATE OR REPLACE FUNCTION public.fn_validate_cash_session_review_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.review_status IS NOT NULL AND NEW.review_status NOT IN ('validada', 'pendiente', 'revisada', 'resuelta') THEN
    RAISE EXCEPTION 'Estado de revisión no válido: %', NEW.review_status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_review_status
  BEFORE INSERT OR UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION fn_validate_cash_session_review_status();

-- Update close trigger to auto-set review fields
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
    
    -- Auto-set review fields based on difference
    IF COALESCE(NEW.difference, 0) != 0 THEN
      NEW.requires_review := true;
      NEW.review_status := 'pendiente';
    ELSE
      NEW.requires_review := false;
      NEW.review_status := 'validada';
    END IF;
  END IF;
  IF OLD.status = 'cerrada' THEN
    -- Allow review_status and discrepancy updates on closed sessions
    IF OLD.review_status IS DISTINCT FROM NEW.review_status
       OR OLD.discrepancy_reason IS DISTINCT FROM NEW.discrepancy_reason
       OR OLD.discrepancy_comment IS DISTINCT FROM NEW.discrepancy_comment THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'No se puede modificar una caja ya cerrada';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
