
-- 1. Add new columns to audit_logs
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS vehicle_id uuid,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS entity_type text;

-- 2. Index for vehicle_id lookups
CREATE INDEX IF NOT EXISTS idx_audit_logs_vehicle_id ON public.audit_logs (vehicle_id) WHERE vehicle_id IS NOT NULL;

-- 3. RLS policy: authenticated users can read audit_logs filtered by vehicle_id
CREATE POLICY "Authenticated users can view vehicle audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (vehicle_id IS NOT NULL AND auth.uid() IS NOT NULL);

-- 4. Replace audit_trigger_func with enhanced version
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
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

    -- Summary for DELETE
    CASE TG_TABLE_NAME
      WHEN 'vehicles' THEN v_summary := 'Vehículo eliminado: ' || COALESCE(v_record->>'brand', '') || ' ' || COALESCE(v_record->>'model', '') || ' ' || COALESCE(v_record->>'plate', '');
      WHEN 'expenses' THEN v_summary := 'Gasto eliminado: ' || COALESCE(v_record->>'description', '') || ' ' || COALESCE(v_record->>'amount', '0') || '€';
      WHEN 'documents' THEN v_summary := 'Documento eliminado: ' || COALESCE(v_record->>'category', '') || ' - ' || COALESCE(v_record->>'filename', '');
      WHEN 'notes' THEN v_summary := 'Nota eliminada';
      WHEN 'proposals' THEN v_summary := 'Propuesta eliminada: ' || COALESCE(v_record->>'buyer_name', '');
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

    -- Summary for INSERT
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

    -- Summary for UPDATE with specific change detection
    IF TG_TABLE_NAME = 'vehicles' THEN
      IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
        v_summary := 'Estado cambiado de ' || COALESCE(v_old->>'status', '?') || ' a ' || COALESCE(v_record->>'status', '?');
      ELSIF (v_old->>'pvp_base') IS DISTINCT FROM (v_record->>'pvp_base') THEN
        v_summary := 'PVP cambiado de ' || COALESCE(v_old->>'pvp_base', '0') || '€ a ' || COALESCE(v_record->>'pvp_base', '0') || '€';
      ELSIF (v_old->>'purchase_price') IS DISTINCT FROM (v_record->>'purchase_price') THEN
        v_summary := 'Precio compra cambiado de ' || COALESCE(v_old->>'purchase_price', '0') || '€ a ' || COALESCE(v_record->>'purchase_price', '0') || '€';
      ELSE
        v_summary := 'Vehículo editado: ' || COALESCE(v_record->>'brand', '') || ' ' || COALESCE(v_record->>'model', '');
      END IF;
    ELSIF TG_TABLE_NAME = 'expenses' THEN
      v_summary := 'Gasto editado: ' || COALESCE(v_record->>'description', '') || ' ' || COALESCE(v_record->>'amount', '0') || '€';
    ELSIF TG_TABLE_NAME = 'invoices' THEN
      IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
        v_summary := 'Factura ' || COALESCE(v_record->>'full_number', 'borrador') || ': estado cambiado a ' || COALESCE(v_record->>'status', '');
      ELSIF (v_old->>'payment_status') IS DISTINCT FROM (v_record->>'payment_status') THEN
        v_summary := 'Factura ' || COALESCE(v_record->>'full_number', 'borrador') || ': pago ' || COALESCE(v_record->>'payment_status', '');
      ELSE
        v_summary := 'Factura editada: ' || COALESCE(v_record->>'full_number', 'borrador');
      END IF;
    ELSIF TG_TABLE_NAME = 'after_sale_tickets' THEN
      IF (v_old->>'validation_status') IS DISTINCT FROM (v_record->>'validation_status') THEN
        v_summary := 'Ticket postventa ' || COALESCE(v_record->>'validation_status', '');
      ELSE
        v_summary := 'Ticket postventa editado';
      END IF;
    ELSIF TG_TABLE_NAME = 'buyers' THEN
      v_summary := 'Cliente editado: ' || COALESCE(v_record->>'name', '');
    ELSIF TG_TABLE_NAME = 'reservations' THEN
      IF (v_old->>'status') IS DISTINCT FROM (v_record->>'status') THEN
        v_summary := 'Reserva: estado cambiado a ' || COALESCE(v_record->>'status', '');
      ELSE
        v_summary := 'Reserva editada';
      END IF;
    ELSE
      v_summary := 'Registro editado en ' || TG_TABLE_NAME;
    END IF;

    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, v_old, v_record, v_vehicle_id, v_summary, v_actor_name, v_entity_type);
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;
