
ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS tpv_terminal_total numeric(12,2),
  ADD COLUMN IF NOT EXISTS tpv_difference numeric(12,2),
  ADD COLUMN IF NOT EXISTS tpv_status text DEFAULT 'pendiente',
  ADD COLUMN IF NOT EXISTS tpv_discrepancy_reason text,
  ADD COLUMN IF NOT EXISTS tpv_discrepancy_comment text,
  ADD COLUMN IF NOT EXISTS general_review_status text DEFAULT 'validada';

-- Add check constraints separately
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_tpv_status_check') THEN
    ALTER TABLE public.cash_sessions ADD CONSTRAINT cash_sessions_tpv_status_check
      CHECK (tpv_status IN ('correcto', 'descuadre', 'pendiente_revision'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cash_sessions_general_review_status_check') THEN
    ALTER TABLE public.cash_sessions ADD CONSTRAINT cash_sessions_general_review_status_check
      CHECK (general_review_status IN ('validada', 'pendiente', 'revisada', 'resuelta'));
  END IF;
END$$;

-- Update trigger to handle TPV reconciliation and general review status
CREATE OR REPLACE FUNCTION public.fn_validate_cash_session_close()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.status = 'abierta' AND NEW.status = 'cerrada' THEN
    IF NEW.counted_balance IS NULL THEN
      RAISE EXCEPTION 'Debe indicar el saldo contado real para cerrar la caja';
    END IF;
    IF NEW.closed_by IS NULL THEN
      RAISE EXCEPTION 'Debe indicar el usuario de cierre';
    END IF;
    NEW.closed_at := COALESCE(NEW.closed_at, now());
    
    -- Auto-set cash review fields based on difference
    IF COALESCE(NEW.difference, 0) != 0 THEN
      NEW.requires_review := true;
      NEW.review_status := 'pendiente';
    ELSE
      NEW.requires_review := false;
      NEW.review_status := 'validada';
    END IF;

    -- Auto-set TPV status
    IF NEW.tpv_terminal_total IS NOT NULL THEN
      IF COALESCE(NEW.tpv_difference, 0) = 0 THEN
        NEW.tpv_status := 'correcto';
      ELSE
        NEW.tpv_status := 'descuadre';
      END IF;
    END IF;

    -- Calculate general_review_status
    IF COALESCE(NEW.difference, 0) != 0 OR COALESCE(NEW.tpv_difference, 0) != 0 THEN
      NEW.general_review_status := 'pendiente';
    ELSE
      NEW.general_review_status := 'validada';
    END IF;
  END IF;

  IF OLD.status = 'cerrada' THEN
    -- Allow review_status, general_review_status, discrepancy and tpv updates on closed sessions
    IF OLD.review_status IS DISTINCT FROM NEW.review_status
       OR OLD.discrepancy_reason IS DISTINCT FROM NEW.discrepancy_reason
       OR OLD.discrepancy_comment IS DISTINCT FROM NEW.discrepancy_comment
       OR OLD.general_review_status IS DISTINCT FROM NEW.general_review_status
       OR OLD.tpv_status IS DISTINCT FROM NEW.tpv_status THEN
      NEW.updated_at := now();
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'No se puede modificar una caja ya cerrada';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
