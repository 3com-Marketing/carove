
-- Add responsible_role and responsible_user_id columns
ALTER TABLE public.vehicle_preparation_items
  ADD COLUMN IF NOT EXISTS responsible_role text NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS responsible_user_id uuid DEFAULT NULL;

ALTER TABLE public.vehicle_preparation_items
  ADD CONSTRAINT vpi_responsible_role_check
  CHECK (responsible_role IN ('admin', 'sales', 'post_sale'));

-- Update existing items with roles based on step_key
UPDATE public.vehicle_preparation_items SET responsible_role = 'admin'
  WHERE step_key IN ('doc_contrato','doc_dni_vendedor','doc_permiso_circulacion','doc_ficha_tecnica','doc_justificante_pago','doc_cambio_titularidad','cos_precio_compra','cos_transferencia','cos_taller','cos_limpieza_transporte','cos_total');

UPDATE public.vehicle_preparation_items SET responsible_role = 'post_sale'
  WHERE step_key IN ('rec_matricula','rec_bastidor','rec_km_entrada','rec_llaves','rec_manual','rec_itv','rec_fotos_entrada','rev_mecanica','rev_diagnosis','rev_neumaticos','rev_frenos','rev_mantenimiento','rev_limpieza','rev_reparaciones_detectadas','rev_reparaciones_completadas');

UPDATE public.vehicle_preparation_items SET responsible_role = 'sales'
  WHERE step_key IN ('com_tasacion','com_precio_venta','com_precio_financiado','com_descripcion','com_fotos','com_centro');

-- Update trigger to include responsible_role in new checklists
CREATE OR REPLACE FUNCTION public.fn_create_preparation_checklist()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'comprado' AND OLD.status != 'comprado' THEN
    UPDATE public.vehicles SET preparation_status = 'pendiente' WHERE id = NEW.vehicle_id;

    -- Documentacion (admin)
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role) VALUES
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_contrato', 'Contrato de compra firmado', true, 1, 'admin'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_dni_vendedor', 'DNI/CIF del vendedor validado', true, 2, 'admin'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_permiso_circulacion', 'Permiso de circulación recibido', true, 3, 'admin'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_ficha_tecnica', 'Ficha técnica recibida', true, 4, 'admin'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_justificante_pago', 'Justificante de pago registrado', true, 5, 'admin'),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_cambio_titularidad', 'Cambio de titularidad iniciado', true, 6, 'admin');

    -- Recepcion (post_sale)
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role) VALUES
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_matricula', 'Matrícula validada', true, 7, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_bastidor', 'Bastidor validado', true, 8, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_km_entrada', 'Kilometraje de entrada confirmado', true, 9, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_llaves', 'Número de llaves registrado', false, 10, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_manual', 'Manual recibido', false, 11, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_itv', 'ITV revisada', true, 12, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_fotos_entrada', 'Fotos de entrada realizadas', true, 13, 'post_sale');

    -- Revision (post_sale)
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role) VALUES
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_mecanica', 'Revisión mecánica realizada', true, 14, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_diagnosis', 'Diagnosis realizada', true, 15, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_neumaticos', 'Neumáticos revisados', true, 16, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_frenos', 'Frenos revisados', true, 17, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_mantenimiento', 'Mantenimiento revisado', false, 18, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_limpieza', 'Limpieza realizada', true, 19, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_reparaciones_detectadas', 'Reparaciones detectadas', false, 20, 'post_sale'),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_reparaciones_completadas', 'Reparaciones completadas', false, 21, 'post_sale');

    -- Costes (admin)
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role) VALUES
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_precio_compra', 'Precio de compra confirmado', true, 22, 'admin'),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_transferencia', 'Gastos de transferencia registrados', true, 23, 'admin'),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_taller', 'Gastos de taller registrados', false, 24, 'admin'),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_limpieza_transporte', 'Gastos de limpieza/transporte registrados', false, 25, 'admin'),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_total', 'Coste total actualizado', true, 26, 'admin');

    -- Comercial (sales)
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order, responsible_role) VALUES
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_tasacion', 'Tasación validada', false, 27, 'sales'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_precio_venta', 'Precio de venta definido', true, 28, 'sales'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_precio_financiado', 'Precio financiado definido', false, 29, 'sales'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_descripcion', 'Descripción comercial completada', true, 30, 'sales'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_fotos', 'Fotografías comerciales subidas', true, 31, 'sales'),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_centro', 'Vehículo asignado a centro/exposición', false, 32, 'sales');
  END IF;
  RETURN NEW;
END;
$function$;
