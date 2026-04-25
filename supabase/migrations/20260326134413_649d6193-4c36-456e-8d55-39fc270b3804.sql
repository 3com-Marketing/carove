
-- Table for preparation checklist items
CREATE TABLE public.vehicle_preparation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) NOT NULL,
  purchase_id uuid REFERENCES public.vehicle_purchases(id) NOT NULL,
  category text NOT NULL,
  step_key text NOT NULL,
  step_label text NOT NULL,
  is_required boolean DEFAULT true,
  is_completed boolean DEFAULT false,
  completed_at timestamptz DEFAULT NULL,
  completed_by uuid DEFAULT NULL,
  notes text DEFAULT NULL,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicle_preparation_items ADD CONSTRAINT vpi_category_check
  CHECK (category IN ('documentacion','recepcion','revision','costes','comercial'));

ALTER TABLE vehicle_preparation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON vehicle_preparation_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER trg_vpi_updated_at BEFORE UPDATE ON vehicle_preparation_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add preparation_status to vehicles
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS preparation_status text DEFAULT NULL;

-- Trigger: auto-create checklist when purchase goes to 'comprado'
CREATE OR REPLACE FUNCTION fn_create_preparation_checklist()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'comprado' AND OLD.status != 'comprado' THEN
    -- Set vehicle preparation_status
    UPDATE public.vehicles SET preparation_status = 'pendiente' WHERE id = NEW.vehicle_id;

    -- Documentacion
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order) VALUES
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_contrato', 'Contrato de compra firmado', true, 1),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_dni_vendedor', 'DNI/CIF del vendedor validado', true, 2),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_permiso_circulacion', 'Permiso de circulación recibido', true, 3),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_ficha_tecnica', 'Ficha técnica recibida', true, 4),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_justificante_pago', 'Justificante de pago registrado', true, 5),
      (NEW.vehicle_id, NEW.id, 'documentacion', 'doc_cambio_titularidad', 'Cambio de titularidad iniciado', true, 6);

    -- Recepcion
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order) VALUES
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_matricula', 'Matrícula validada', true, 7),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_bastidor', 'Bastidor validado', true, 8),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_km_entrada', 'Kilometraje de entrada confirmado', true, 9),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_llaves', 'Número de llaves registrado', false, 10),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_manual', 'Manual recibido', false, 11),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_itv', 'ITV revisada', true, 12),
      (NEW.vehicle_id, NEW.id, 'recepcion', 'rec_fotos_entrada', 'Fotos de entrada realizadas', true, 13);

    -- Revision
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order) VALUES
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_mecanica', 'Revisión mecánica realizada', true, 14),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_diagnosis', 'Diagnosis realizada', true, 15),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_neumaticos', 'Neumáticos revisados', true, 16),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_frenos', 'Frenos revisados', true, 17),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_mantenimiento', 'Mantenimiento revisado', false, 18),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_limpieza', 'Limpieza realizada', true, 19),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_reparaciones_detectadas', 'Reparaciones detectadas', false, 20),
      (NEW.vehicle_id, NEW.id, 'revision', 'rev_reparaciones_completadas', 'Reparaciones completadas', false, 21);

    -- Costes
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order) VALUES
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_precio_compra', 'Precio de compra confirmado', true, 22),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_transferencia', 'Gastos de transferencia registrados', true, 23),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_taller', 'Gastos de taller registrados', false, 24),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_limpieza_transporte', 'Gastos de limpieza/transporte registrados', false, 25),
      (NEW.vehicle_id, NEW.id, 'costes', 'cos_total', 'Coste total actualizado', true, 26);

    -- Comercial
    INSERT INTO vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, sort_order) VALUES
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_tasacion', 'Tasación validada', false, 27),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_precio_venta', 'Precio de venta definido', true, 28),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_precio_financiado', 'Precio financiado definido', false, 29),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_descripcion', 'Descripción comercial completada', true, 30),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_fotos', 'Fotografías comerciales subidas', true, 31),
      (NEW.vehicle_id, NEW.id, 'comercial', 'com_centro', 'Vehículo asignado a centro/exposición', false, 32);
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_vp_create_checklist AFTER UPDATE ON vehicle_purchases
  FOR EACH ROW EXECUTE FUNCTION fn_create_preparation_checklist();

-- Trigger: update preparation_status when items change
CREATE OR REPLACE FUNCTION fn_update_preparation_status()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  v_total_required int;
  v_completed_required int;
  v_total_completed int;
  v_new_status text;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE is_required = true),
    COUNT(*) FILTER (WHERE is_required = true AND is_completed = true),
    COUNT(*) FILTER (WHERE is_completed = true)
  INTO v_total_required, v_completed_required, v_total_completed
  FROM vehicle_preparation_items
  WHERE vehicle_id = NEW.vehicle_id;

  IF v_completed_required >= v_total_required AND v_total_required > 0 THEN
    v_new_status := 'completado';
  ELSIF v_total_completed > 0 THEN
    v_new_status := 'en_progreso';
  ELSE
    v_new_status := 'pendiente';
  END IF;

  UPDATE vehicles SET preparation_status = v_new_status
  WHERE id = NEW.vehicle_id AND preparation_status IS DISTINCT FROM v_new_status;

  RETURN NEW;
END; $$;

CREATE TRIGGER trg_vpi_update_status AFTER UPDATE ON vehicle_preparation_items
  FOR EACH ROW EXECUTE FUNCTION fn_update_preparation_status();
