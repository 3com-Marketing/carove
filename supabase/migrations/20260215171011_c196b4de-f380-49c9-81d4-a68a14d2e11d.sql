
-- Create vehicle_insurances table
CREATE TABLE public.vehicle_insurances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  insurer_name text NOT NULL,
  policy_number text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  insurance_type text NOT NULL DEFAULT 'individual',
  pdf_document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  observations text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.vehicle_insurances ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Vehicle insurances viewable by authenticated"
  ON public.vehicle_insurances FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Vehicle insurances insertable by authenticated"
  ON public.vehicle_insurances FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Vehicle insurances updatable by authenticated"
  ON public.vehicle_insurances FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Vehicle insurances deletable by admins"
  ON public.vehicle_insurances FOR DELETE
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- Validation trigger: end_date >= start_date
CREATE OR REPLACE FUNCTION public.validate_insurance_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'La fecha de vencimiento no puede ser anterior a la fecha de inicio';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_insurance_dates
  BEFORE INSERT OR UPDATE ON public.vehicle_insurances
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_insurance_dates();

-- updated_at trigger
CREATE TRIGGER update_vehicle_insurances_updated_at
  BEFORE UPDATE ON public.vehicle_insurances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger for vehicle_insurances
CREATE OR REPLACE FUNCTION public.audit_vehicle_insurance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name text;
  v_summary text;
  v_vehicle_id uuid;
BEGIN
  -- Get actor name
  SELECT full_name INTO v_actor_name
  FROM public.profiles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    v_vehicle_id := NEW.vehicle_id;
    v_summary := format('Seguro creado: %s #%s (%s - %s)',
      NEW.insurer_name, NEW.policy_number,
      to_char(NEW.start_date, 'DD/MM/YYYY'),
      to_char(NEW.end_date, 'DD/MM/YYYY'));
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'INSERT', 'vehicle_insurances', NEW.id, to_jsonb(NEW), v_vehicle_id, v_summary, v_actor_name, 'insurance');
  ELSIF TG_OP = 'UPDATE' THEN
    v_vehicle_id := NEW.vehicle_id;
    v_summary := format('Seguro actualizado: %s #%s', NEW.insurer_name, NEW.policy_number);
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'UPDATE', 'vehicle_insurances', NEW.id, to_jsonb(OLD), to_jsonb(NEW), v_vehicle_id, v_summary, v_actor_name, 'insurance');
  ELSIF TG_OP = 'DELETE' THEN
    v_vehicle_id := OLD.vehicle_id;
    v_summary := format('Seguro eliminado: %s #%s', OLD.insurer_name, OLD.policy_number);
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, vehicle_id, summary, actor_name, entity_type)
    VALUES (auth.uid(), 'DELETE', 'vehicle_insurances', OLD.id, to_jsonb(OLD), v_vehicle_id, v_summary, v_actor_name, 'insurance');
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_audit_vehicle_insurance
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicle_insurances
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_vehicle_insurance();

-- Index for fast lookup by vehicle
CREATE INDEX idx_vehicle_insurances_vehicle_id ON public.vehicle_insurances(vehicle_id);
