
-- Create vehicle_appraisals table
CREATE TABLE public.vehicle_appraisals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  appraiser_id uuid NOT NULL,
  appraiser_name text NOT NULL DEFAULT '',
  appraisal_date timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'borrador',
  exterior_score integer NOT NULL DEFAULT 3,
  exterior_notes text NOT NULL DEFAULT '',
  interior_score integer NOT NULL DEFAULT 3,
  interior_notes text NOT NULL DEFAULT '',
  mechanical_score integer NOT NULL DEFAULT 3,
  mechanical_notes text NOT NULL DEFAULT '',
  tires_score integer NOT NULL DEFAULT 3,
  tires_notes text NOT NULL DEFAULT '',
  electrical_score integer NOT NULL DEFAULT 3,
  electrical_notes text NOT NULL DEFAULT '',
  overall_score numeric NOT NULL DEFAULT 3,
  market_value numeric NOT NULL DEFAULT 0,
  offer_price numeric NOT NULL DEFAULT 0,
  internal_notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_appraisals ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Appraisals viewable by authenticated"
  ON public.vehicle_appraisals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Appraisals insertable by authenticated"
  ON public.vehicle_appraisals FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Appraisals updatable by authenticated"
  ON public.vehicle_appraisals FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Appraisals deletable by admins"
  ON public.vehicle_appraisals FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_vehicle_appraisals_updated_at
  BEFORE UPDATE ON public.vehicle_appraisals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
