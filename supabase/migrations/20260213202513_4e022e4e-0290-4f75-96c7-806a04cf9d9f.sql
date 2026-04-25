
-- =============================================
-- FASE 1: Módulo de Traspasos entre Sucursales
-- =============================================

-- 1. Añadir campo branch a profiles (sin default, admin asigna)
ALTER TABLE public.profiles ADD COLUMN branch TEXT;

-- 2. Tabla vehicle_transfers
CREATE TABLE public.vehicle_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  origin_branch TEXT NOT NULL,
  destination_branch TEXT NOT NULL,
  requesting_branch TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'solicitado',
  requested_by UUID NOT NULL,
  sent_by UUID,
  received_by UUID,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  cancelled_by UUID,
  cancelled_at TIMESTAMPTZ,
  vehicle_center_at_request TEXT NOT NULL,
  observations TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Índice único parcial: solo un traspaso activo por vehículo
CREATE UNIQUE INDEX idx_one_active_transfer
  ON public.vehicle_transfers (vehicle_id)
  WHERE status IN ('solicitado', 'enviado');

-- 4. Trigger updated_at
CREATE TRIGGER update_vehicle_transfers_updated_at
  BEFORE UPDATE ON public.vehicle_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 5. RLS
ALTER TABLE public.vehicle_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Transfers viewable by authenticated"
  ON public.vehicle_transfers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Transfers insertable by authenticated"
  ON public.vehicle_transfers FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Transfers updatable by authenticated"
  ON public.vehicle_transfers FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- No DELETE policy (nunca se eliminan)

-- 6. fn_transfer_validate_request (BEFORE INSERT)
CREATE OR REPLACE FUNCTION public.fn_transfer_validate_request()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  v_current_center text;
BEGIN
  -- Obtener center actual del vehículo
  SELECT center INTO v_current_center
    FROM public.vehicles WHERE id = NEW.vehicle_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vehículo no encontrado: %', NEW.vehicle_id;
  END IF;

  -- Validar que origin_branch coincida con center actual
  IF NEW.origin_branch != v_current_center THEN
    RAISE EXCEPTION 'La sucursal origen (%) no coincide con la ubicación actual del vehículo (%)', NEW.origin_branch, v_current_center;
  END IF;

  -- Validar origen != destino
  IF NEW.origin_branch = NEW.destination_branch THEN
    RAISE EXCEPTION 'La sucursal origen y destino no pueden ser la misma';
  END IF;

  -- Setear snapshot
  NEW.vehicle_center_at_request := v_current_center;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transfer_validate_request
  BEFORE INSERT ON public.vehicle_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_transfer_validate_request();

-- 7. fn_transfer_validate_transition (BEFORE UPDATE)
CREATE OR REPLACE FUNCTION public.fn_transfer_validate_transition()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- Si el estado no cambia, permitir
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Transiciones válidas
  IF OLD.status = 'solicitado' AND NEW.status IN ('enviado', 'cancelado') THEN
    NULL; -- válido
  ELSIF OLD.status = 'enviado' AND NEW.status IN ('recibido', 'cancelado') THEN
    NULL; -- válido
  ELSE
    RAISE EXCEPTION 'Transición de estado no permitida: % -> %', OLD.status, NEW.status;
  END IF;

  -- Validar campos obligatorios según transición
  IF NEW.status = 'enviado' THEN
    IF NEW.sent_by IS NULL THEN
      RAISE EXCEPTION 'sent_by es obligatorio para marcar como enviado';
    END IF;
    IF NEW.sent_at IS NULL THEN
      NEW.sent_at := now();
    END IF;
  END IF;

  IF NEW.status = 'recibido' THEN
    IF NEW.received_by IS NULL THEN
      RAISE EXCEPTION 'received_by es obligatorio para marcar como recibido';
    END IF;
    IF NEW.received_at IS NULL THEN
      NEW.received_at := now();
    END IF;
  END IF;

  IF NEW.status = 'cancelado' THEN
    IF NEW.cancellation_reason IS NULL OR TRIM(NEW.cancellation_reason) = '' THEN
      RAISE EXCEPTION 'El motivo de cancelación es obligatorio';
    END IF;
    IF NEW.cancelled_by IS NULL THEN
      NEW.cancelled_by := auth.uid();
    END IF;
    NEW.cancelled_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transfer_validate_transition
  BEFORE UPDATE ON public.vehicle_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_transfer_validate_transition();

-- 8. fn_transfer_on_received (AFTER UPDATE) - actualiza vehicles.center
CREATE OR REPLACE FUNCTION public.fn_transfer_on_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status != 'recibido' AND NEW.status = 'recibido' THEN
    -- Setear variable de sesión para permitir el cambio de center
    PERFORM set_config('app.transfer_update', 'true', true);

    UPDATE public.vehicles
      SET center = NEW.destination_branch,
          updated_at = now()
      WHERE id = NEW.vehicle_id;

    -- Resetear variable de sesión
    PERFORM set_config('app.transfer_update', 'false', true);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_transfer_on_received
  AFTER UPDATE ON public.vehicle_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_transfer_on_received();

-- 9. fn_prevent_manual_center_change (BEFORE UPDATE en vehicles)
CREATE OR REPLACE FUNCTION public.fn_prevent_manual_center_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.center IS DISTINCT FROM NEW.center THEN
    IF current_setting('app.transfer_update', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'La sucursal solo puede cambiarse mediante un traspaso formal';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_manual_center_change
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_manual_center_change();

-- 10. fn_block_repair_if_in_transit (BEFORE INSERT en repair_orders)
CREATE OR REPLACE FUNCTION public.fn_block_repair_if_in_transit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.vehicle_transfers
    WHERE vehicle_id = NEW.vehicle_id AND status = 'enviado'
  ) THEN
    RAISE EXCEPTION 'No se puede abrir orden de reparación para un vehículo en tránsito';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_repair_if_in_transit
  BEFORE INSERT ON public.repair_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_block_repair_if_in_transit();

-- 11. fn_block_sale_if_in_transit (BEFORE INSERT en sales)
CREATE OR REPLACE FUNCTION public.fn_block_sale_if_in_transit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.vehicle_transfers
    WHERE vehicle_id = NEW.vehicle_id AND status = 'enviado'
  ) THEN
    RAISE EXCEPTION 'No se puede vender un vehículo en tránsito';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_sale_if_in_transit
  BEFORE INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_block_sale_if_in_transit();

-- 12. Auditoría: añadir vehicle_transfers al trigger existente
-- Actualizar audit_trigger_func para incluir vehicle_transfers -> 'traspaso'
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_id uuid;
  v_summary text;
  v_actor_name text;
  v_entity_type text;
  v_record jsonb;
  v_old jsonb;
BEGIN
  -- Get actor name
  BEGIN
    SELECT full_name INTO v_actor_name FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_actor_name := NULL;
  END;

  -- Map table name to entity_type
  CASE TG_TABLE_NAME
    WHEN 'vehicles' THEN v_entity_type := 'vehiculo';
    WHEN 'expenses' THEN v_entity_type := 'gasto';
    WHEN 'documents' THEN v_entity_type := 'documento';
    WHEN 'invoices' THEN v_entity_type := 'factura';
    WHEN 'payments' THEN v_entity_type := 'cobro';
    WHEN 'buyers' THEN v_entity_type := 'cliente';
    WHEN 'reservations' THEN v_entity_type := 'reserva';
    WHEN 'notes' THEN v_entity_type := 'nota';
    WHEN 'after_sale_tickets' THEN v_entity_type := 'postventa';
    WHEN 'proposals' THEN v_entity_type := 'propuesta';
    WHEN 'sales' THEN v_entity_type := 'venta';
    WHEN 'repair_orders' THEN v_entity_type := 'orden_reparacion';
    WHEN 'repair_order_categories' THEN v_entity_type := 'categoria_reparacion';
    WHEN 'supplier_invoices' THEN v_entity_type := 'factura_proveedor';
    WHEN 'supplier_payments' THEN v_entity_type := 'pago_proveedor';
    WHEN 'vehicle_transfers' THEN v_entity_type := 'traspaso';
    ELSE v_entity_type := TG_TABLE_NAME;
  END CASE;

  -- Extract vehicle_id and build summary
  IF TG_OP = 'DELETE' THEN
    v_record := to_jsonb(OLD);
    v_old := v_record;
    v_vehicle_id := CASE
      WHEN TG_TABLE_NAME = 'vehicles' THEN OLD.id
      WHEN v_record ? 'vehicle_id' THEN (v_record->>'vehicle_id')::uuid
      ELSE NULL
    END;

    CASE TG_TABLE_NAME
      WHEN 'vehicles' THEN v_summary := 'Vehículo eliminado: ' || COALESCE(v_record->>'brand', '') || ' ' || COALESCE(v_record->>'model', '') || ' ' || COALESCE(v_record->>'plate', '');
      WHEN 'expenses' THEN v_summary := 'Gasto eliminado: ' || COALESCE(v_record->>'description', '') || ' ' || COALESCE(v_record->>'amount', '0') || '€';
      WHEN 'documents' THEN v_summary := 'Documento eliminado: ' || COALESCE(v_record->>'category', '') || ' - ' || COALESCE(v_record->>'filename', '');
      WHEN 'notes' THEN v_summary := 'Nota eliminada';
      WHEN 'proposals' THEN v_summary := 'Propuesta eliminada: ' || COALESCE(v_record->>'buyer_name', '');
      WHEN 'repair_order_categories' THEN v_summary := 'Categoría eliminada: ' || COALESCE(v_record->>'category_type', '');
      WHEN 'vehicle_transfers' THEN v_summary := 'Traspaso eliminado: ' || COALESCE(v_record->>'origin_branch', '') || ' → ' || COALESCE(v_record->>'destination_branch', '');
      ELSE v_summary := 'Registro eliminado en ' || TG_TABLE_NAME;
    END CASE;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, v_old, v_vehicle_id, v_summary, v_actor_name, v_entity_type);
    RETURN OLD;

  ELSIF TG_OP = 'INSERT' THEN
    v_record := to_jsonb(NEW);
    v_vehicle_id := CASE
      WHEN TG_TABLE_NAME = 'vehicles' THEN NEW.id
      WHEN v_record ? 'vehicle_id' THEN (v_record->>'vehicle_id')::uuid
      ELSE NULL
    END;

    CASE TG_TABLE_NAME
      WHEN 'vehicles' THEN v_summary := 'Vehículo creado: ' || COALESCE(v_record->>'brand', '') || ' ' || COALESCE(v_record->>'model', '') || ' ' || COALESCE(v_record->>'plate', '');
      WHEN 'expenses' THEN v_summary := 'Gasto añadido: ' || COALESCE(v_record->>'description', '') || ' ' || COALESCE(v_record->>'amount', '0') || '€';
      WHEN 'documents' THEN v_summary := 'Documento subido: ' || COALESCE(v_record->>'category', '');
      WHEN 'notes' THEN v_summary := 'Nota añadida';
      WHEN 'after_sale_tickets' THEN v_summary := 'Ticket postventa creado: ' || COALESCE(v_record->>'task_description', '');
      WHEN 'buyers' THEN v_summary := 'Cliente creado: ' || COALESCE(v_record->>'name', '');
      WHEN 'proposals' THEN v_summary := 'Propuesta creada: ' || COALESCE(v_record->>'buyer_name', '') || ' ' || COALESCE(v_record->>'total_amount', '0') || '€';
      WHEN 'invoices' THEN v_summary := 'Factura creada: ' || COALESCE(v_record->>'buyer_name', '') || ' ' || COALESCE(v_record->>'total_amount', '0') || '€';
      WHEN 'payments' THEN v_summary := 'Cobro registrado: ' || COALESCE(v_record->>'amount', '0') || '€';
      WHEN 'reservations' THEN v_summary := 'Reserva creada: ' || COALESCE(v_record->>'reservation_amount', '0') || '€';
      WHEN 'sales' THEN v_summary := 'Venta registrada: ' || COALESCE(v_record->>'total_amount', '0') || '€';
      WHEN 'repair_orders' THEN v_summary := 'Orden de reparación creada';
      WHEN 'repair_order_categories' THEN v_summary := 'Categoría añadida: ' || COALESCE(v_record->>'category_type', '') || ' ' || COALESCE(v_record->>'estimated_amount', '0') || '€';
      WHEN 'supplier_invoices' THEN v_summary := 'Factura proveedor: ' || COALESCE(v_record->>'invoice_number', '') || ' ' || COALESCE(v_record->>'total_amount', '0') || '€';
      WHEN 'supplier_payments' THEN v_summary := 'Pago a proveedor: ' || COALESCE(v_record->>'amount', '0') || '€';
      WHEN 'vehicle_transfers' THEN v_summary := 'Traspaso solicitado: ' || COALESCE(v_record->>'origin_branch', '') || ' → ' || COALESCE(v_record->>'destination_branch', '');
      ELSE v_summary := 'Registro creado en ' || TG_TABLE_NAME;
    END CASE;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, v_record, v_vehicle_id, v_summary, v_actor_name, v_entity_type);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    v_record := to_jsonb(NEW);
    v_old := to_jsonb(OLD);
    v_vehicle_id := CASE
      WHEN TG_TABLE_NAME = 'vehicles' THEN NEW.id
      WHEN v_record ? 'vehicle_id' THEN (v_record->>'vehicle_id')::uuid
      ELSE NULL
    END;

    CASE TG_TABLE_NAME
      WHEN 'vehicles' THEN
        IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
          v_summary := 'Estado cambiado de ' || COALESCE(v_old->>'status', '?') || ' a ' || COALESCE(v_record->>'status', '?');
        ELSE
          v_summary := 'Vehículo actualizado: ' || COALESCE(v_record->>'brand', '') || ' ' || COALESCE(v_record->>'model', '');
        END IF;
      WHEN 'expenses' THEN v_summary := 'Gasto actualizado: ' || COALESCE(v_record->>'description', '');
      WHEN 'invoices' THEN
        IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
          v_summary := 'Factura ' || COALESCE(v_record->>'full_number', 'borrador') || ' estado: ' || COALESCE(v_record->>'status', '');
        ELSE
          v_summary := 'Factura actualizada: ' || COALESCE(v_record->>'full_number', 'borrador');
        END IF;
      WHEN 'reservations' THEN
        IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
          v_summary := 'Reserva ' || COALESCE(v_record->>'status', '');
        ELSE
          v_summary := 'Reserva actualizada';
        END IF;
      WHEN 'after_sale_tickets' THEN
        IF (v_old->>'validation_status') IS DISTINCT FROM (v_record->>'validation_status') THEN
          v_summary := 'Ticket postventa ' || COALESCE(v_record->>'validation_status', '');
        ELSE
          v_summary := 'Ticket postventa actualizado';
        END IF;
      WHEN 'buyers' THEN v_summary := 'Cliente actualizado: ' || COALESCE(v_record->>'name', '');
      WHEN 'repair_orders' THEN
        IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
          v_summary := 'Orden de reparación: ' || COALESCE(v_old->>'status', '?') || ' → ' || COALESCE(v_record->>'status', '?');
        ELSE
          v_summary := 'Orden de reparación actualizada';
        END IF;
      WHEN 'repair_order_categories' THEN v_summary := 'Categoría actualizada: ' || COALESCE(v_record->>'category_type', '');
      WHEN 'supplier_invoices' THEN
        IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
          v_summary := 'Factura proveedor ' || COALESCE(v_record->>'invoice_number', '') || ': ' || COALESCE(v_record->>'status', '');
        ELSE
          v_summary := 'Factura proveedor actualizada: ' || COALESCE(v_record->>'invoice_number', '');
        END IF;
      WHEN 'vehicle_transfers' THEN
        IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
          CASE v_record->>'status'
            WHEN 'enviado' THEN v_summary := 'Traspaso enviado';
            WHEN 'recibido' THEN v_summary := 'Traspaso recibido: vehículo ahora en ' || COALESCE(v_record->>'destination_branch', '');
            WHEN 'cancelado' THEN v_summary := 'Traspaso cancelado: ' || COALESCE(v_record->>'cancellation_reason', '');
            ELSE v_summary := 'Traspaso actualizado: ' || COALESCE(v_record->>'status', '');
          END CASE;
        ELSE
          v_summary := 'Traspaso actualizado';
        END IF;
      ELSE v_summary := 'Registro actualizado en ' || TG_TABLE_NAME;
    END CASE;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, v_old, v_record, v_vehicle_id, v_summary, v_actor_name, v_entity_type);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- 13. Attach audit trigger to vehicle_transfers
CREATE TRIGGER audit_vehicle_transfers
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_transfers
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();
