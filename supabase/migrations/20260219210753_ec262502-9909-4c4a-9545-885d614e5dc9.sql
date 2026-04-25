
-- Tabla demands
CREATE TABLE public.demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  buyer_id uuid NOT NULL REFERENCES buyers(id),
  brand_preferences text[] NOT NULL DEFAULT '{}',
  model_preferences text[] NOT NULL DEFAULT '{}',
  segment_id uuid REFERENCES vehicle_segments(id),
  fuel_types text[] NOT NULL DEFAULT '{}',
  transmission text,
  year_min integer,
  year_max integer,
  km_max integer,
  price_min numeric,
  price_max numeric,
  preferred_color text,
  required_extras text,
  max_budget numeric,
  needs_financing boolean NOT NULL DEFAULT false,
  down_payment numeric,
  has_trade_in boolean NOT NULL DEFAULT false,
  trade_in_notes text,
  intention_level text NOT NULL DEFAULT 'exploracion',
  commercial_notes text,
  status text NOT NULL DEFAULT 'activa',
  cancelled_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid,
  converted_sale_id uuid REFERENCES sales(id),
  converted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_demands_buyer ON demands(buyer_id);
CREATE INDEX idx_demands_user ON demands(user_id);
CREATE INDEX idx_demands_status ON demands(status);

ALTER TABLE demands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Demands viewable by owner or admin"
  ON demands FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'));

CREATE POLICY "Demands insertable by authenticated"
  ON demands FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Demands updatable by owner or admin"
  ON demands FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'));

-- Trigger updated_at manual
CREATE OR REPLACE FUNCTION public.fn_demands_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_demands_updated_at
  BEFORE UPDATE ON demands
  FOR EACH ROW EXECUTE FUNCTION fn_demands_updated_at();

-- Trigger audit
CREATE TRIGGER demands_audit_trigger
  AFTER INSERT OR UPDATE ON demands
  FOR EACH ROW EXECUTE FUNCTION audit_trigger_func();

-- Vincular actividades a demandas
ALTER TABLE commercial_activities
  ADD COLUMN demand_id uuid REFERENCES demands(id);
