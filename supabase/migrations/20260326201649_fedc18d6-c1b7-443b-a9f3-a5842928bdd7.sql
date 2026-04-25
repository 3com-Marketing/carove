
-- =====================================================
-- Unificar reservation_status: español → inglés
-- Deprecar campo status legacy
-- =====================================================

-- 1. Renombrar estados existentes de reservation_status (español → inglés)
UPDATE public.reservations SET reservation_status = 'draft' WHERE reservation_status = 'borrador';
UPDATE public.reservations SET reservation_status = 'pending_signature' WHERE reservation_status = 'pendiente_firma';
UPDATE public.reservations SET reservation_status = 'signed' WHERE reservation_status = 'firmada';
UPDATE public.reservations SET reservation_status = 'converted' WHERE reservation_status = 'convertida';
UPDATE public.reservations SET reservation_status = 'cancelled' WHERE reservation_status = 'cancelada';
UPDATE public.reservations SET reservation_status = 'expired' WHERE reservation_status = 'vencida';

-- 2. Smart migration: inferir estado correcto para reservas que aún tengan estados legacy
UPDATE public.reservations
SET reservation_status = 'converted'
WHERE reservation_status NOT IN ('draft','pending_signature','signed','converted','cancelled','expired')
  AND (converted_to_sale_at IS NOT NULL OR converted_sale_id IS NOT NULL);

UPDATE public.reservations
SET reservation_status = 'signed'
WHERE reservation_status NOT IN ('draft','pending_signature','signed','converted','cancelled','expired')
  AND signed_at IS NOT NULL;

UPDATE public.reservations
SET reservation_status = 'pending_signature'
WHERE reservation_status NOT IN ('draft','pending_signature','signed','converted','cancelled','expired')
  AND passed_to_signature_at IS NOT NULL AND signed_at IS NULL;

UPDATE public.reservations
SET reservation_status = 'cancelled'
WHERE reservation_status NOT IN ('draft','pending_signature','signed','converted','cancelled','expired')
  AND status = 'cancelada';

UPDATE public.reservations
SET reservation_status = 'expired'
WHERE reservation_status NOT IN ('draft','pending_signature','signed','converted','cancelled','expired')
  AND status = 'expirada';

UPDATE public.reservations
SET reservation_status = 'draft'
WHERE reservation_status NOT IN ('draft','pending_signature','signed','converted','cancelled','expired');

-- 3. Reemplazar índice único
DROP INDEX IF EXISTS idx_one_active_reservation;
CREATE UNIQUE INDEX idx_one_active_reservation_v2 
  ON public.reservations (vehicle_id) 
  WHERE reservation_status IN ('pending_signature', 'signed');

-- 4. Actualizar fn_validate_commercial_transition
CREATE OR REPLACE FUNCTION public.fn_validate_commercial_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_has_active_reservation boolean;
  v_has_sale boolean;
  v_has_active_transfer boolean;
  v_has_active_repair boolean;
  v_purchase_status text;
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

  IF OLD.status = 'no_disponible' THEN
    IF NEW.status != 'disponible' THEN
      RAISE EXCEPTION 'Un vehículo no disponible solo puede pasar a Disponible';
    END IF;
    SELECT status INTO v_purchase_status
      FROM public.vehicle_purchases
      WHERE vehicle_id = NEW.id
      ORDER BY created_at DESC LIMIT 1;
    IF v_purchase_status IS NULL OR v_purchase_status != 'comprado' THEN
      RAISE EXCEPTION 'No se puede activar el vehículo: el proceso de compra no está completado';
    END IF;
    RETURN NEW;
  END IF;

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
      SELECT 1 FROM public.reservations 
      WHERE vehicle_id = NEW.id 
      AND reservation_status IN ('pending_signature', 'signed')
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

-- 5. Actualizar fn_validate_reservation_deposit
CREATE OR REPLACE FUNCTION public.fn_validate_reservation_deposit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_status text;
BEGIN
  SELECT status INTO v_vehicle_status FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF v_vehicle_status = 'no_disponible' THEN
    RAISE EXCEPTION 'No se puede reservar un vehículo no disponible. Complete primero el proceso de compra.';
  END IF;

  IF NEW.reservation_status IN ('pending_signature', 'signed') THEN
    IF COALESCE(NEW.reservation_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'La señal debe ser superior a 0,00 € para formalizar la reserva';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- 6. Actualizar fn_assign_reservation_number
CREATE OR REPLACE FUNCTION public.fn_assign_reservation_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year int;
  v_seq int;
BEGIN
  IF OLD.reservation_status IS DISTINCT FROM NEW.reservation_status
     AND NEW.reservation_status = 'pending_signature'
     AND NEW.reservation_number IS NULL THEN

    v_year := EXTRACT(YEAR FROM now());
    SELECT COALESCE(MAX(
      NULLIF(SPLIT_PART(reservation_number, '-', 3), '')::int
    ), 0) + 1
    INTO v_seq
    FROM public.reservations
    WHERE reservation_number LIKE 'RES-' || v_year || '-%';

    NEW.reservation_number := 'RES-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$$;

-- 7. Actualizar fn_block_deprecated_reservation_states (bloquear estados legacy)
CREATE OR REPLACE FUNCTION public.fn_block_deprecated_reservation_states()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.reservation_status IN ('pagada', 'entregada', 'borrador', 'pendiente_firma', 'firmada', 'convertida', 'cancelada', 'vencida', 'reservada') THEN
    RAISE EXCEPTION 'Estado de reserva legacy "%" no permitido. Use estados en inglés: draft, pending_signature, signed, converted, cancelled, expired.', NEW.reservation_status;
  END IF;
  RETURN NEW;
END;
$$;

-- 8. Deprecar columna status
COMMENT ON COLUMN reservations.status IS 'DEPRECATED - usar reservation_status como fuente única de verdad';

-- 9. Audit log
INSERT INTO public.audit_logs (action, table_name, record_id, summary, actor_name, entity_type)
VALUES ('UPDATE', 'reservations', NULL, 'Migración: estados de reserva renombrados de español a inglés. Campo status deprecado.', 'sistema', 'reservation');
