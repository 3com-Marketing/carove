
-- 1. Add new columns to reservations
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS passed_to_signature_at timestamptz;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS delivered_at timestamptz;
ALTER TABLE public.reservations ADD COLUMN IF NOT EXISTS signature_snapshot jsonb;

-- 2. Create reservation_documents table
CREATE TABLE IF NOT EXISTS public.reservation_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  document_type text NOT NULL,
  version int DEFAULT 1,
  status text DEFAULT 'generated',
  generated_at timestamptz DEFAULT now(),
  snapshot_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  template_version text DEFAULT '1.0',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reservation_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage reservation documents"
  ON public.reservation_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Create reservation_timeline table
CREATE TABLE IF NOT EXISTS public.reservation_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id uuid REFERENCES public.reservations(id) ON DELETE CASCADE NOT NULL,
  event_type text NOT NULL,
  actor_id uuid REFERENCES auth.users(id),
  actor_name text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reservation_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage reservation timeline"
  ON public.reservation_timeline FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Insert additional contract clauses for sales contract
INSERT INTO public.reservation_clauses (clause_key, title, body, sort_order, is_active) VALUES
  ('cargas_gravamenes', 'Cargas y gravámenes', 'La parte vendedora declara que el vehículo objeto de la presente compraventa se encuentra libre de cargas, gravámenes, embargos y cualquier tipo de limitación de dominio, respondiendo en caso contrario ante la parte compradora.', 10, true),
  ('documentacion_titularidad', 'Documentación y cambio de titularidad', 'La parte vendedora se compromete a entregar toda la documentación necesaria para el cambio de titularidad del vehículo, incluyendo permiso de circulación, ficha técnica y cualquier otro documento requerido por la normativa vigente.', 11, true),
  ('estado_vehiculo', 'Estado del vehículo', 'La parte compradora declara haber examinado el vehículo y conocer su estado actual, aceptándolo en las condiciones en que se encuentra. El vehículo se vende con {{km}} kilómetros registrados.', 12, true),
  ('entrega_vehiculo', 'Entrega del vehículo', 'La entrega del vehículo se realizará una vez completado el pago total del precio acordado y formalizados todos los trámites administrativos necesarios.', 13, true),
  ('seguro_itv', 'Seguro e ITV', 'El comprador se compromete a contratar un seguro obligatorio para el vehículo antes de su circulación. La ITV vigente será la que conste en la documentación del vehículo en el momento de la entrega.', 14, true),
  ('garantia', 'Garantía', 'El vehículo cuenta con la garantía legal establecida por la normativa de protección al consumidor para vehículos de ocasión, salvo pacto específico entre las partes.', 15, true),
  ('exclusiones_garantia', 'Exclusiones de garantía', 'Quedan excluidos de la garantía los defectos derivados del uso normal, desgaste de piezas consumibles, modificaciones realizadas por el comprador y daños causados por uso indebido o negligencia.', 16, true),
  ('jurisdiccion', 'Jurisdicción', 'Para cualquier controversia derivada del presente contrato, las partes se someten a los juzgados y tribunales de la localidad donde radique el establecimiento del vendedor.', 17, true),
  ('llaves_cierre', 'Llaves y sistema de cierre', 'Se entregan al comprador las llaves del vehículo según se detalla: número de llaves entregadas según la ficha del vehículo.', 18, true)
ON CONFLICT (clause_key) DO NOTHING;
