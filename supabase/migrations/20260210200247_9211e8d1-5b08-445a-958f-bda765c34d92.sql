
-- Enforce that a user cannot validate their own after_sale_tickets at the database level
CREATE OR REPLACE FUNCTION public.prevent_self_validation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Only check when validation_status is being changed from 'pendiente'
  IF OLD.validation_status = 'pendiente' AND NEW.validation_status IN ('validado', 'rechazado') THEN
    IF NEW.validated_by = OLD.requested_by THEN
      RAISE EXCEPTION 'No puedes validar tus propias tareas de postventa';
    END IF;
    -- Also log the validation attempt in audit
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_prevent_self_validation
  BEFORE UPDATE ON public.after_sale_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_self_validation();
