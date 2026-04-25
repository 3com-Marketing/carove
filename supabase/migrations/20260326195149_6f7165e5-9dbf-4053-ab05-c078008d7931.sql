
-- Create completed checklist items for disponible vehicles without preparation items
INSERT INTO public.vehicle_preparation_items (vehicle_id, purchase_id, category, step_key, step_label, is_required, is_completed, completed_at, responsible_role, sort_order, notes)
SELECT
  v.id,
  (SELECT vp.id FROM public.vehicle_purchases vp WHERE vp.vehicle_id = v.id ORDER BY vp.created_at DESC LIMIT 1),
  cat.category,
  cat.step_key,
  cat.step_label,
  true,
  true,
  now(),
  cat.responsible_role,
  cat.sort_order,
  'Completado automáticamente por migración de regularización'
FROM public.vehicles v
CROSS JOIN (VALUES
  ('documentacion', 'doc_permiso', 'Permiso de circulación verificado', 'admin', 1),
  ('documentacion', 'doc_ficha', 'Ficha técnica verificada', 'admin', 2),
  ('documentacion', 'doc_contrato', 'Contrato de compra archivado', 'admin', 3),
  ('recepcion', 'rec_exterior', 'Inspección visual exterior', 'post_sale', 4),
  ('recepcion', 'rec_interior', 'Inspección visual interior', 'post_sale', 5),
  ('recepcion', 'rec_km', 'Verificación de km', 'post_sale', 6),
  ('revision', 'rev_mecanica', 'Revisión mecánica básica', 'post_sale', 7),
  ('revision', 'rev_neumaticos', 'Comprobación de neumáticos', 'post_sale', 8),
  ('comercial', 'com_fotos', 'Fotos del vehículo realizadas', 'sales', 9),
  ('comercial', 'com_precio', 'Precio de venta asignado', 'admin', 10)
) AS cat(category, step_key, step_label, responsible_role, sort_order)
WHERE v.status = 'disponible'
  AND NOT EXISTS (
    SELECT 1 FROM public.vehicle_preparation_items vpi WHERE vpi.vehicle_id = v.id
  )
  AND EXISTS (
    SELECT 1 FROM public.vehicle_purchases vp WHERE vp.vehicle_id = v.id
  );

-- Ensure preparation_status = 'completado' for all disponible vehicles
UPDATE public.vehicles
SET preparation_status = 'completado'
WHERE status = 'disponible'
  AND (preparation_status IS NULL OR preparation_status != 'completado');

-- Audit log for regularized vehicles (only those not already logged)
INSERT INTO public.audit_logs (action, table_name, record_id, vehicle_id, summary, actor_name, entity_type)
SELECT
  'UPDATE', 'vehicles', v.id, v.id,
  'Vehículo regularizado automáticamente para adaptarse a la nueva lógica de disponibilidad',
  'sistema', 'vehicle'
FROM public.vehicles v
WHERE v.status = 'disponible'
  AND NOT EXISTS (
    SELECT 1 FROM public.audit_logs al
    WHERE al.vehicle_id = v.id
      AND al.summary LIKE '%regularizado automáticamente%'
  );
