
-- Update the checklist trigger to format task titles as [PLATE - MODEL] step_label
-- and vehicle_label as PLATE - BRAND MODEL
CREATE OR REPLACE FUNCTION fn_generate_preparation_checklist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_vehicle_label text;
  v_vehicle_plate text;
  v_vehicle_model text;
  v_task_title text;
  v_item_id uuid;
  v_task_id uuid;
  v_step_label text;
BEGIN
  IF NEW.status = 'comprado' AND OLD.status != 'comprado' THEN
    UPDATE public.vehicles SET preparation_status = 'pendiente' WHERE id = NEW.vehicle_id;

    SELECT plate, model, COALESCE(plate || ' - ' || brand || ' ' || model, plate)
    INTO v_vehicle_plate, v_vehicle_model, v_vehicle_label
    FROM public.vehicles WHERE id = NEW.vehicle_id;

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

    -- Auto-create tasks for all items with execution_type = 'task'
    -- Title format: [PLATE - MODEL] step_label
    FOR v_item_id IN
      SELECT id FROM vehicle_preparation_items
      WHERE vehicle_id = NEW.vehicle_id AND purchase_id = NEW.id AND execution_type = 'task'
      ORDER BY sort_order
    LOOP
      SELECT step_label INTO v_step_label FROM vehicle_preparation_items WHERE id = v_item_id;
      
      -- Build formatted title
      v_task_title := '[' || COALESCE(v_vehicle_plate, '???') || ' - ' || COALESCE(v_vehicle_model, '???') || '] ' || v_step_label;

      INSERT INTO tasks (title, description, vehicle_id, vehicle_label, status, priority, created_by, created_by_name,
        source_module, source_type, source_id, purchase_id)
      VALUES (
        v_task_title,
        'Preparación vehículo: ' || v_step_label,
        NEW.vehicle_id,
        COALESCE(v_vehicle_label, ''),
        'pendiente',
        'media',
        NEW.created_by,
        COALESCE((SELECT full_name FROM profiles WHERE user_id = NEW.created_by LIMIT 1), ''),
        'vehicle_preparation',
        'checklist_item',
        v_item_id,
        NEW.id
      )
      RETURNING id INTO v_task_id;

      UPDATE vehicle_preparation_items SET linked_task_id = v_task_id WHERE id = v_item_id;
    END LOOP;

  END IF;
  RETURN NEW;
END;
$$;
