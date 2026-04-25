
-- ══════════════════════════════════════════════════════════
-- Vehicle Master Data: Segments, Brands, Models
-- ══════════════════════════════════════════════════════════

-- 1. Vehicle Segments
CREATE TABLE public.vehicle_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  size_range text NOT NULL DEFAULT '',
  examples text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.vehicle_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Segments viewable by authenticated"
  ON public.vehicle_segments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Segments insertable by admins"
  ON public.vehicle_segments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Segments updatable by admins"
  ON public.vehicle_segments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role));

-- Seed segments
INSERT INTO public.vehicle_segments (code, name, description, size_range, examples) VALUES
  ('MICRO', 'Micro / Urbano', 'Vehículos urbanos muy compactos', '< 3.7 m', 'Smart ForTwo, Fiat 500, Toyota Aygo'),
  ('UTIL', 'Utilitario', 'Vehículos pequeños versátiles', '3.7 – 4.0 m', 'Renault Clio, Peugeot 208, VW Polo'),
  ('COMP', 'Compacto', 'Segmento C, los más vendidos', '4.0 – 4.5 m', 'VW Golf, Seat León, Ford Focus'),
  ('BERLM', 'Berlina media', 'Sedanes y familiares de gama media', '4.5 – 4.8 m', 'VW Passat, Mazda 6, Peugeot 508'),
  ('BERLG', 'Berlina grande', 'Sedanes premium y de representación', '> 4.8 m', 'Mercedes Clase E, BMW Serie 5, Audi A6'),
  ('SUVC', 'SUV compacto', 'SUV urbanos y crossover pequeños', '4.0 – 4.4 m', 'Seat Arona, Peugeot 2008, Hyundai Kona'),
  ('SUVM', 'SUV medio', 'SUV familiares', '4.4 – 4.7 m', 'Nissan Qashqai, Toyota RAV4, VW Tiguan'),
  ('SUVG', 'SUV grande', 'SUV de gran tamaño y premium', '> 4.7 m', 'BMW X5, Hyundai Santa Fe, VW Touareg'),
  ('MONO', 'Monovolumen', 'Vehículos familiares de gran capacidad', '4.3 – 5.0 m', 'Citroën C4 Picasso, Renault Scénic, Seat Alhambra'),
  ('DEPO', 'Deportivo', 'Coupés y descapotables deportivos', 'Variable', 'Mazda MX-5, BMW Serie 2 Coupé, Ford Mustang'),
  ('PICK', 'Pick-up', 'Vehículos con caja de carga abierta', '> 5.0 m', 'Toyota Hilux, Ford Ranger, Nissan Navara'),
  ('FURG', 'Furgoneta', 'Vehículos de carga cerrados', 'Variable', 'VW Transporter, Mercedes Vito, Renault Trafic'),
  ('COML', 'Comercial ligero', 'Vehículos comerciales ligeros y derivados', 'Variable', 'Citroën Berlingo, VW Caddy, Renault Kangoo');

-- 2. Master Brands
CREATE TABLE public.master_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  normalized_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  is_validated boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_by uuid,
  validated_at timestamptz
);

ALTER TABLE public.master_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Brands viewable by authenticated"
  ON public.master_brands FOR SELECT TO authenticated USING (true);

CREATE POLICY "Brands insertable by authenticated"
  ON public.master_brands FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Brands updatable by admins"
  ON public.master_brands FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role));

-- Seed brands (use a system UUID for created_by)
INSERT INTO public.master_brands (name, normalized_name, is_validated, created_by) VALUES
  ('Volkswagen', 'volkswagen', true, '00000000-0000-0000-0000-000000000000'),
  ('Seat', 'seat', true, '00000000-0000-0000-0000-000000000000'),
  ('BMW', 'bmw', true, '00000000-0000-0000-0000-000000000000'),
  ('Mercedes-Benz', 'mercedes-benz', true, '00000000-0000-0000-0000-000000000000'),
  ('Audi', 'audi', true, '00000000-0000-0000-0000-000000000000'),
  ('Renault', 'renault', true, '00000000-0000-0000-0000-000000000000'),
  ('Toyota', 'toyota', true, '00000000-0000-0000-0000-000000000000'),
  ('Peugeot', 'peugeot', true, '00000000-0000-0000-0000-000000000000'),
  ('Ford', 'ford', true, '00000000-0000-0000-0000-000000000000'),
  ('Hyundai', 'hyundai', true, '00000000-0000-0000-0000-000000000000'),
  ('Kia', 'kia', true, '00000000-0000-0000-0000-000000000000'),
  ('Citroën', 'citroen', true, '00000000-0000-0000-0000-000000000000'),
  ('Opel', 'opel', true, '00000000-0000-0000-0000-000000000000'),
  ('Nissan', 'nissan', true, '00000000-0000-0000-0000-000000000000'),
  ('Skoda', 'skoda', true, '00000000-0000-0000-0000-000000000000'),
  ('Dacia', 'dacia', true, '00000000-0000-0000-0000-000000000000'),
  ('Fiat', 'fiat', true, '00000000-0000-0000-0000-000000000000'),
  ('Mazda', 'mazda', true, '00000000-0000-0000-0000-000000000000');

-- 3. Master Models
CREATE TABLE public.master_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid NOT NULL REFERENCES public.master_brands(id),
  name text NOT NULL,
  normalized_name text NOT NULL,
  body_type text NOT NULL,
  segment_id uuid NOT NULL REFERENCES public.vehicle_segments(id),
  active boolean NOT NULL DEFAULT true,
  is_validated boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_by uuid,
  validated_at timestamptz,
  UNIQUE(brand_id, normalized_name, body_type)
);

ALTER TABLE public.master_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Models viewable by authenticated"
  ON public.master_models FOR SELECT TO authenticated USING (true);

CREATE POLICY "Models insertable by authenticated"
  ON public.master_models FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Models updatable by admins"
  ON public.master_models FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'::app_role));

-- 4. ALTER vehicles table
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS master_brand_id uuid REFERENCES public.master_brands(id),
  ADD COLUMN IF NOT EXISTS master_model_id uuid REFERENCES public.master_models(id),
  ADD COLUMN IF NOT EXISTS body_type text,
  ADD COLUMN IF NOT EXISTS segment_id uuid REFERENCES public.vehicle_segments(id),
  ADD COLUMN IF NOT EXISTS segment_auto_assigned boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS needs_review boolean DEFAULT false;

-- 5. Trigger: auto-fill segment_id and body_type from master_model
CREATE OR REPLACE FUNCTION public.sync_vehicle_from_master_model()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.master_model_id IS NOT NULL AND (
    TG_OP = 'INSERT' OR OLD.master_model_id IS DISTINCT FROM NEW.master_model_id
  ) THEN
    SELECT m.segment_id, m.body_type
    INTO NEW.segment_id, NEW.body_type
    FROM public.master_models m
    WHERE m.id = NEW.master_model_id;
    NEW.segment_auto_assigned := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER vehicle_master_model_sync
  BEFORE INSERT OR UPDATE ON public.vehicles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_vehicle_from_master_model();
