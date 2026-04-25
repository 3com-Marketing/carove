
-- Create master_versions table
CREATE TABLE public.master_versions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  master_model_id uuid NOT NULL REFERENCES public.master_models(id),
  name text NOT NULL,
  normalized_name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  is_validated boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  validated_by uuid,
  validated_at timestamptz,
  UNIQUE(master_model_id, normalized_name)
);

-- Enable RLS
ALTER TABLE public.master_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Versions viewable by authenticated"
  ON public.master_versions FOR SELECT
  USING (true);

CREATE POLICY "Versions insertable by authenticated"
  ON public.master_versions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Versions updatable by admins"
  ON public.master_versions FOR UPDATE
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- Trigger: deactivate versions when model is deactivated
CREATE OR REPLACE FUNCTION public.deactivate_versions_on_model_deactivate()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.active = false AND OLD.active = true THEN
    UPDATE public.master_versions SET active = false WHERE master_model_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_deactivate_versions_on_model
  AFTER UPDATE ON public.master_models
  FOR EACH ROW
  EXECUTE FUNCTION public.deactivate_versions_on_model_deactivate();

-- Add master_version_id to vehicles
ALTER TABLE public.vehicles ADD COLUMN master_version_id uuid REFERENCES public.master_versions(id);
