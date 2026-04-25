
-- Automatically set vehicle status to 'reparacion' when a new expense is created
-- Only if the vehicle is currently 'disponible' or 'reservado'
CREATE OR REPLACE FUNCTION public.set_vehicle_reparacion_on_expense()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.vehicles
  SET status = 'reparacion', updated_at = now()
  WHERE id = NEW.vehicle_id
    AND status IN ('disponible', 'reservado');
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_expense_set_reparacion
  AFTER INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.set_vehicle_reparacion_on_expense();
