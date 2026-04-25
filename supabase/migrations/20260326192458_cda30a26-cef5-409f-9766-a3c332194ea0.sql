
-- 1. Update fn_validate_commercial_transition to handle no_disponible
CREATE OR REPLACE FUNCTION public.fn_validate_commercial_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- no_disponible: only allow transition to disponible
  IF OLD.status = 'no_disponible' THEN
    IF NEW.status != 'disponible' THEN
      RAISE EXCEPTION 'Un vehículo no disponible solo puede pasar a Disponible';
    END IF;
    -- Check purchase is completed
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
$function$;

-- 2. Create auto-purchase trigger
CREATE OR REPLACE FUNCTION public.fn_auto_create_purchase_on_vehicle_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_placeholder_id uuid;
BEGIN
  -- Only for vehicles created as no_disponible
  IF NEW.status != 'no_disponible' THEN
    RETURN NEW;
  END IF;

  -- Get or create placeholder seller
  SELECT id INTO v_placeholder_id
    FROM public.buyers
    WHERE name = 'Pendiente de asignar' AND is_seller = true
    LIMIT 1;

  IF v_placeholder_id IS NULL THEN
    INSERT INTO public.buyers (name, is_seller, is_buyer, client_type, active)
    VALUES ('Pendiente de asignar', true, false, 'particular', true)
    RETURNING id INTO v_placeholder_id;
  END IF;

  -- Create purchase record
  INSERT INTO public.vehicle_purchases (
    vehicle_id, seller_id, status, source_type, created_by, updated_by
  ) VALUES (
    NEW.id, v_placeholder_id, 'nuevo', COALESCE(NEW.created_from, 'manual'), NEW.created_by, NEW.created_by
  );

  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_auto_create_purchase
  AFTER INSERT ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_create_purchase_on_vehicle_insert();

-- 3. Update fn_purchase_sync_to_vehicle to also set status to disponible
CREATE OR REPLACE FUNCTION public.fn_purchase_sync_to_vehicle()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_status text;
BEGIN
  IF NEW.status = 'comprado' AND OLD.status != 'comprado' THEN
    -- Get current vehicle status
    SELECT status INTO v_current_status FROM public.vehicles WHERE id = NEW.vehicle_id;

    UPDATE public.vehicles SET
      purchase_price = COALESCE(NEW.agreed_price, 0),
      purchase_date = COALESCE(NEW.purchase_date::timestamptz, now()),
      owner_client_id = NEW.seller_id,
      created_from = NEW.source_type,
      -- If vehicle is no_disponible, transition to disponible
      status = CASE WHEN v_current_status = 'no_disponible' THEN 'disponible' ELSE v_current_status END,
      updated_at = now()
    WHERE id = NEW.vehicle_id;
    UPDATE public.buyers SET is_seller = true WHERE id = NEW.seller_id AND is_seller = false;
  END IF;
  RETURN NEW;
END;
$function$;

-- 4. Block reservation on no_disponible vehicles
CREATE OR REPLACE FUNCTION public.fn_validate_reservation_deposit()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_vehicle_status text;
BEGIN
  -- Block reservations on no_disponible vehicles
  SELECT status INTO v_vehicle_status FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF v_vehicle_status = 'no_disponible' THEN
    RAISE EXCEPTION 'No se puede reservar un vehículo no disponible. Complete primero el proceso de compra.';
  END IF;

  IF NEW.reservation_status IN ('pendiente_firma', 'reservada') THEN
    IF COALESCE(NEW.reservation_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'La señal debe ser superior a 0,00 € para formalizar la reserva';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
