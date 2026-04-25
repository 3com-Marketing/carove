
-- 1. Create acquisition_channels table
CREATE TABLE public.acquisition_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.acquisition_channels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Channels viewable by authenticated"
  ON public.acquisition_channels FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Channels insertable by admins"
  ON public.acquisition_channels FOR INSERT
  TO authenticated WITH CHECK (public.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Channels updatable by admins"
  ON public.acquisition_channels FOR UPDATE
  TO authenticated USING (public.has_role(auth.uid(), 'administrador'::app_role));

-- 2. Seed initial channels
INSERT INTO public.acquisition_channels (name) VALUES
  ('Web'), ('Teléfono'), ('Recomendación'), ('Walk-in'), ('Portal coches'), ('Redes sociales');

-- 3. Alter buyers table
ALTER TABLE public.buyers
  ADD COLUMN IF NOT EXISTS client_type text NOT NULL DEFAULT 'particular',
  ADD COLUMN IF NOT EXISTS is_buyer boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_seller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acquisition_channel_id uuid REFERENCES public.acquisition_channels(id),
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS company_name text,
  ADD COLUMN IF NOT EXISTS cif text,
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS fiscal_address text,
  ADD COLUMN IF NOT EXISTS vat_regime text,
  ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS type_changed_at timestamptz;

-- 4. Add check constraint for at least one role
ALTER TABLE public.buyers
  ADD CONSTRAINT buyers_at_least_one_role CHECK (is_buyer = true OR is_seller = true);
