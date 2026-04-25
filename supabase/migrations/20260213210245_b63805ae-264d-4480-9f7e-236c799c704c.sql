
-- ═══════════════════════════════════════════════════════════
-- MODELO FORMAL DE ESTADOS DEL VEHÍCULO
-- ═══════════════════════════════════════════════════════════

-- 1. Add new columns
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS is_deregistered BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS status_change_reason TEXT;

-- 2. Migrate data
UPDATE public.vehicles SET status = 'disponible' WHERE status = 'reparacion';
UPDATE public.vehicles SET is_deregistered = true, status = 'disponible' WHERE status = 'baja';

-- 3. Recreate enum: drop default first, then change type, then restore default
ALTER TABLE public.vehicles ALTER COLUMN status DROP DEFAULT;
ALTER TYPE vehicle_status RENAME TO vehicle_status_old;
CREATE TYPE vehicle_status AS ENUM ('disponible', 'reservado', 'vendido', 'entregado');
ALTER TABLE public.vehicles ALTER COLUMN status TYPE vehicle_status USING status::text::vehicle_status;
ALTER TABLE public.vehicles ALTER COLUMN status SET DEFAULT 'disponible'::vehicle_status;
DROP TYPE vehicle_status_old;

-- 4. Drop the old repair order vehicle status trigger
DROP TRIGGER IF EXISTS trg_repair_order_vehicle_status ON public.repair_orders;

-- 5. Replace fn_repair_order_vehicle_status: NO longer touches vehicles.status
CREATE OR REPLACE FUNCTION public.fn_repair_order_vehicle_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status text;
BEGIN
  IF NEW.status IN ('abierta','presupuestada','aprobada','en_ejecucion') THEN
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status NOT IN ('abierta','presupuestada','aprobada','en_ejecucion')) THEN
      SELECT status::text INTO v_current_status FROM public.vehicles WHERE id = NEW.vehicle_id;
      NEW.previous_vehicle_status := v_current_status;
    END IF;
  END IF;

  IF NEW.status = 'finalizada' THEN
    IF TG_OP = 'UPDATE' AND OLD.status IN ('abierta','presupuestada','aprobada','en_ejecucion') THEN
      NEW.actual_end_date := COALESCE(NEW.actual_end_date, now());
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_repair_order_vehicle_status
  BEFORE INSERT OR UPDATE ON public.repair_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_repair_order_vehicle_status();

-- 6. Transition validation trigger
CREATE OR REPLACE FUNCTION public.fn_validate_commercial_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_active_reservation boolean;
  v_has_sale boolean;
  v_has_active_transfer boolean;
  v_has_active_repair boolean;
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  IF OLD.is_deregistered = true OR NEW.is_deregistered = true THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      RAISE EXCEPTION 'No se puede cambiar el estado de un vehículo dado de baja';
    END IF;
  END IF;

  SELECT EXISTS(
    SELECT 1 FROM public.vehicle_transfers WHERE vehicle_id = NEW.id AND status = 'enviado'
  ) INTO v_has_active_transfer;

  SELECT EXISTS(
    SELECT 1 FROM public.repair_orders WHERE vehicle_id = NEW.id AND status IN ('abierta','presupuestada','aprobada','en_ejecucion')
  ) INTO v_has_active_repair;

  IF OLD.status = 'disponible' THEN
    IF NEW.status NOT IN ('reservado', 'vendido') THEN
      RAISE EXCEPTION 'Transición no permitida: disponible → %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'reservado' THEN
    IF NEW.status NOT IN ('vendido', 'disponible') THEN
      RAISE EXCEPTION 'Transición no permitida: reservado → %', NEW.status;
    END IF;
  END IF;

  IF OLD.status = 'vendido' THEN
    IF NEW.status NOT IN ('entregado', 'disponible') THEN
      RAISE EXCEPTION 'Transición no permitida: vendido → %', NEW.status;
    END IF;
    IF NEW.status = 'disponible' THEN
      IF NOT has_role(auth.uid(), 'administrador') THEN
        RAISE EXCEPTION 'Solo un administrador puede revertir una venta';
      END IF;
      IF NEW.status_change_reason IS NULL OR TRIM(NEW.status_change_reason) = '' THEN
        RAISE EXCEPTION 'Se requiere un motivo para revertir la venta';
      END IF;
    END IF;
  END IF;

  IF OLD.status = 'entregado' THEN
    RAISE EXCEPTION 'Un vehículo entregado no puede cambiar de estado';
  END IF;

  IF NEW.status = 'reservado' THEN
    IF v_has_active_transfer THEN
      RAISE EXCEPTION 'No se puede reservar un vehículo en tránsito';
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.reservations WHERE vehicle_id = NEW.id AND status = 'activa'
    ) INTO v_has_active_reservation;
    IF NOT v_has_active_reservation THEN
      RAISE EXCEPTION 'Se requiere una reserva activa para pasar a Reservado';
    END IF;
  END IF;

  IF NEW.status = 'vendido' THEN
    IF v_has_active_transfer THEN
      RAISE EXCEPTION 'No se puede vender un vehículo en tránsito';
    END IF;
    IF NEW.is_deregistered THEN
      RAISE EXCEPTION 'No se puede vender un vehículo dado de baja';
    END IF;
    SELECT EXISTS(
      SELECT 1 FROM public.sales WHERE vehicle_id = NEW.id AND total_amount > 0
    ) INTO v_has_sale;
    IF NOT v_has_sale THEN
      RAISE EXCEPTION 'Se requiere una venta registrada para pasar a Vendido';
    END IF;
  END IF;

  IF NEW.status = 'entregado' THEN
    IF NEW.delivery_date IS NULL THEN
      RAISE EXCEPTION 'Se requiere fecha de entrega para pasar a Entregado';
    END IF;
    IF v_has_active_transfer THEN
      RAISE EXCEPTION 'No se puede entregar un vehículo en tránsito';
    END IF;
    IF v_has_active_repair THEN
      RAISE EXCEPTION 'No se puede entregar un vehículo en reparación';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_commercial_transition
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_commercial_transition();

-- 7. Protection for is_deregistered
CREATE OR REPLACE FUNCTION public.fn_protect_deregistered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.is_deregistered IS DISTINCT FROM NEW.is_deregistered THEN
    IF NOT has_role(auth.uid(), 'administrador') THEN
      RAISE EXCEPTION 'Solo un administrador puede dar de baja o reactivar un vehículo';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_deregistered
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_protect_deregistered();

-- 8. Block repairs on deregistered vehicles
CREATE OR REPLACE FUNCTION public.fn_block_repair_if_deregistered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT is_deregistered FROM public.vehicles WHERE id = NEW.vehicle_id) THEN
    RAISE EXCEPTION 'No se puede crear una reparación para un vehículo dado de baja';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_repair_if_deregistered
  BEFORE INSERT ON public.repair_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_block_repair_if_deregistered();

-- 9. Block transfers on deregistered vehicles
CREATE OR REPLACE FUNCTION public.fn_block_transfer_if_deregistered()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT is_deregistered FROM public.vehicles WHERE id = NEW.vehicle_id) THEN
    RAISE EXCEPTION 'No se puede crear un traspaso para un vehículo dado de baja';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_transfer_if_deregistered
  BEFORE INSERT ON public.vehicle_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_block_transfer_if_deregistered();
