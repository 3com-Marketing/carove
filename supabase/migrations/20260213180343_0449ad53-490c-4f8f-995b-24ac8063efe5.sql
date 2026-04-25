
-- Tabla vehicle_images
CREATE TABLE public.vehicle_images (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  original_url TEXT NOT NULL,
  thumbnail_url TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  alt_text TEXT NOT NULL DEFAULT '',
  is_public BOOLEAN NOT NULL DEFAULT true,
  uploaded_by UUID NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indice para consultas frecuentes
CREATE INDEX idx_vehicle_images_vehicle_id ON public.vehicle_images(vehicle_id, order_index);

-- RLS alineada con vehicles
ALTER TABLE public.vehicle_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vehicle images viewable by authenticated"
  ON public.vehicle_images FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Vehicle images insertable by authenticated"
  ON public.vehicle_images FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Vehicle images updatable by authenticated"
  ON public.vehicle_images FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Vehicle images deletable by authenticated"
  ON public.vehicle_images FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Bucket publico para imagenes de vehiculos
INSERT INTO storage.buckets (id, name, public)
VALUES ('vehicle-images', 'vehicle-images', true);

-- Storage RLS: lectura publica
CREATE POLICY "Vehicle images publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-images');

-- Storage RLS: authenticated pueden subir
CREATE POLICY "Authenticated users can upload vehicle images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vehicle-images' AND auth.uid() IS NOT NULL);

-- Storage RLS: authenticated pueden eliminar
CREATE POLICY "Authenticated users can delete vehicle images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vehicle-images' AND auth.uid() IS NOT NULL);
