CREATE OR REPLACE FUNCTION public.fn_reservation_set_vehicle_reserved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'activa' OR NEW.reservation_status IN ('borrador', 'pendiente_firma', 'reservada') THEN
    UPDATE public.vehicles
    SET status = 'reservado', updated_at = now()
    WHERE id = NEW.vehicle_id
      AND status = 'disponible';
  END IF;
  RETURN NEW;
END;
$$;