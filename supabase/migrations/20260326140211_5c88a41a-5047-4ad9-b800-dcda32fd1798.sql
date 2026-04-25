
-- 1. Ampliar vehicle_preparation_items
ALTER TABLE vehicle_preparation_items
  ADD COLUMN IF NOT EXISTS execution_type text NOT NULL DEFAULT 'manual_check',
  ADD COLUMN IF NOT EXISTS linked_task_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_repair_order_id uuid DEFAULT NULL;

ALTER TABLE vehicle_preparation_items
  ADD CONSTRAINT vpi_execution_type_check
  CHECK (execution_type IN ('task', 'repair_order', 'manual_check'));

-- 2. Ampliar tasks
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS source_module text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS purchase_id uuid DEFAULT NULL;

-- 3. Ampliar repair_orders
ALTER TABLE repair_orders
  ADD COLUMN IF NOT EXISTS source_module text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS source_id uuid DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS purchase_id uuid DEFAULT NULL;

-- 4. Update existing checklist items with execution_type
UPDATE vehicle_preparation_items SET execution_type = 'task'
WHERE step_key IN (
  'doc_contrato','doc_dni_vendedor','doc_permiso_circulacion','doc_ficha_tecnica',
  'doc_justificante_pago','doc_cambio_titularidad',
  'cos_precio_compra','cos_transferencia','cos_taller','cos_limpieza_transporte','cos_total',
  'rec_matricula','rec_bastidor','rec_km_entrada','rec_itv','rec_fotos_entrada',
  'com_precio_venta','com_precio_financiado','com_descripcion','com_fotos','com_centro'
);

UPDATE vehicle_preparation_items SET execution_type = 'repair_order'
WHERE step_key IN (
  'rev_mecanica','rev_diagnosis','rev_neumaticos','rev_frenos',
  'rev_mantenimiento','rev_limpieza','rev_reparaciones_detectadas','rev_reparaciones_completadas'
);

-- manual_check stays for: rec_llaves, rec_manual, com_tasacion (already default)

-- 5. Updated trigger: create checklist with execution_type + auto-create tasks
CREATE OR REPLACE FUNCTION fn_create_preparation_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_item_id uuid;
  v_task_id uuid;
  v_vehicle_label text;
BEGIN
  IF NEW.status = 'comprado' AND OLD.status != 'comprado' THEN
    UPDATE public.vehicles SET preparation_status = 'pendiente' WHERE id = NEW.vehicle_id;

    SELECT COALESCE(brand || ' ' || model || ' (' || plate || ')', plate)
    INTO v_vehicle_label FROM public.vehicles WHERE id = NEW.vehicle_id;

    -- Helper: insert items, then create tasks for 'task' type items
    -- Documentacion (admin) - task
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role, execution_type) VALUES
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_contrato', 'Contrato de compra firmado', true, 1, 'admin', 'task'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_dni_vendedor', 'DNI/CIF del vendedor validado', true, 2, 'admin', 'task'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_permiso_circulacion', 'Permiso de circulación recibido', true, 3, 'admin', 'task'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_ficha_tecnica', 'Ficha técnica recibida', true, 4, 'admin', 'task'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_justificante_pago', 'Justificante de pago registrado', true, 5, 'admin', 'task'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_cambio_titularidad', 'Cambio de titularidad iniciado', true, 6, 'admin', 'task');

    -- Recepcion (post_sale) - mixed
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role, execution_type) VALUES
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_matricula', 'Matrícula validada', true, 7, 'post_sale', 'task'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_bastidor', 'Bastidor validado', true, 8, 'post_sale', 'task'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_km_entrada', 'Kilometraje de entrada confirmado', true, 9, 'post_sale', 'task'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_llaves', 'Número de llaves registrado', false, 10, 'post_sale', 'manual_check'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_manual', 'Manual recibido', false, 11, 'post_sale', 'manual_check'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_itv', 'ITV revisada', true, 12, 'post_sale', 'task'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_fotos_entrada', 'Fotos de entrada realizadas', true, 13, 'post_sale', 'task');

    -- Revision (post_sale) - repair_order
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role, execution_type) VALUES
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_mecanica', 'Revisión mecánica realizada', true, 14, 'post_sale', 'repair_order'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_diagnosis', 'Diagnosis realizada', true, 15, 'post_sale', 'repair_order'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_neumaticos', 'Neumáticos revisados', true, 16, 'post_sale', 'repair_order'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_frenos', 'Frenos revisados', true, 17, 'post_sale', 'repair_order'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_mantenimiento', 'Mantenimiento revisado', false, 18, 'post_sale', 'repair_order'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_limpieza', 'Limpieza realizada', true, 19, 'post_sale', 'repair_order'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_reparaciones_detectadas', 'Reparaciones detectadas', false, 20, 'post_sale', 'repair_order'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_reparaciones_completadas', 'Reparaciones completadas', false, 21, 'post_sale', 'repair_order');

    -- Costes (admin) - task
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role, execution_type) VALUES
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_precio_compra', 'Precio de compra confirmado', true, 22, 'admin', 'task'),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_transferencia', 'Gastos de transferencia registrados', true, 23, 'admin', 'task'),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_taller', 'Gastos de taller registrados', false, 24, 'admin', 'task'),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_limpieza_transporte', 'Gastos de limpieza/transporte registrados', false, 25, 'admin', 'task'),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_total', 'Coste total actualizado', true, 26, 'admin', 'task');

    -- Comercial (sales) - mixed
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role, execution_type) VALUES
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_tasacion', 'Tasación validada', false, 27, 'sales', 'manual_check'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_precio_venta', 'Precio de venta definido', true, 28, 'sales', 'task'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_precio_financiado', 'Precio financiado definido', false, 29, 'sales', 'task'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_descripcion', 'Descripción comercial completada', true, 30, 'sales', 'task'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_fotos', 'Fotografías comerciales subidas', true, 31, 'sales', 'task'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_centro', 'Vehículo asignado a centro/exposición', false, 32, 'sales', 'task');

    -- Now auto-create tasks for all items with execution_type = 'task'
    FOR v_item_id IN
      SELECT id FROM vehicle_preparation_items
      WHERE vehicle_id = NEW.vehicle_id AND purchase_id = NEW.id AND execution_type = 'task'
      ORDER BY sort_order
    LOOP
      INSERT INTO tasks (title, description, vehicle_id, vehicle_label, status, priority, created_by, created_by_name,
        source_module, source_type, source_id, purchase_id)
      SELECT
        vpi.step_label,
        'Preparación vehículo: ' || vpi.step_label,
        NEW.vehicle_id,
        COALESCE(v_vehicle_label, ''),
        'pendiente',
        'media',
        NEW.created_by,
        COALESCE((SELECT full_name FROM profiles WHERE user_id = NEW.created_by LIMIT 1), ''),
        'vehicle_preparation',
        'checklist_item',
        vpi.id,
        NEW.id
      FROM vehicle_preparation_items vpi WHERE vpi.id = v_item_id
      RETURNING id INTO v_task_id;

      UPDATE vehicle_preparation_items SET linked_task_id = v_task_id WHERE id = v_item_id;
    END LOOP;

  END IF;
  RETURN NEW;
END;
$$;

-- 6. Trigger: task → checklist sync
CREATE OR REPLACE FUNCTION fn_sync_task_to_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.source_module = 'vehicle_preparation' AND NEW.source_id IS NOT NULL THEN
    IF NEW.status = 'completada' THEN
      UPDATE vehicle_preparation_items
      SET is_completed = true,
          completed_at = now(),
          completed_by = COALESCE(NEW.assigned_to, NEW.created_by)
      WHERE id = NEW.source_id AND is_completed = false;
    ELSIF OLD.status = 'completada' AND NEW.status IN ('pendiente', 'en_curso') THEN
      UPDATE vehicle_preparation_items
      SET is_completed = false,
          completed_at = NULL,
          completed_by = NULL
      WHERE id = NEW.source_id AND is_completed = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_task_to_checklist
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION fn_sync_task_to_checklist();

-- 7. Trigger: repair_order → checklist sync
CREATE OR REPLACE FUNCTION fn_sync_repair_order_to_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.source_module = 'vehicle_preparation' AND NEW.source_id IS NOT NULL THEN
    IF NEW.status = 'finalizada' THEN
      UPDATE vehicle_preparation_items
      SET is_completed = true,
          completed_at = now(),
          completed_by = NEW.created_by
      WHERE id = NEW.source_id AND is_completed = false;
    ELSIF NEW.status IN ('abierta', 'presupuestada', 'aprobada', 'en_ejecucion', 'cancelada') AND OLD.status = 'finalizada' THEN
      UPDATE vehicle_preparation_items
      SET is_completed = false,
          completed_at = NULL,
          completed_by = NULL
      WHERE id = NEW.source_id AND is_completed = true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_repair_order_to_checklist
AFTER UPDATE ON repair_orders
FOR EACH ROW
EXECUTE FUNCTION fn_sync_repair_order_to_checklist();
