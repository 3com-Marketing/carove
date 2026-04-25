
-- =============================================
-- Tax Models Configuration Table
-- =============================================
CREATE TABLE public.tax_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  model_code TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('trimestral', 'anual')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  category TEXT NOT NULL CHECK (category IN ('iva', 'igic', 'irpf', 'sociedades', 'informativa')),
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Tax Model Periods Table
-- =============================================
CREATE TABLE public.tax_model_periods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tax_model_id UUID NOT NULL REFERENCES public.tax_models(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  quarter INTEGER CHECK (quarter IS NULL OR (quarter >= 1 AND quarter <= 4)),
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'verificado', 'presentado')),
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  presented_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tax_model_id, year, quarter)
);

-- =============================================
-- RLS for tax_models
-- =============================================
ALTER TABLE public.tax_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tax models viewable by authenticated"
  ON public.tax_models FOR SELECT
  USING (true);

CREATE POLICY "Tax models updatable by admins"
  ON public.tax_models FOR UPDATE
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- =============================================
-- RLS for tax_model_periods
-- =============================================
ALTER TABLE public.tax_model_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tax periods viewable by authenticated"
  ON public.tax_model_periods FOR SELECT
  USING (true);

CREATE POLICY "Tax periods insertable by admins"
  ON public.tax_model_periods FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Tax periods updatable by admins"
  ON public.tax_model_periods FOR UPDATE
  USING (has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Tax periods deletable by admins"
  ON public.tax_model_periods FOR DELETE
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX idx_tax_model_periods_model ON public.tax_model_periods(tax_model_id);
CREATE INDEX idx_tax_model_periods_year ON public.tax_model_periods(year, quarter);

-- =============================================
-- Updated_at trigger
-- =============================================
CREATE TRIGGER update_tax_models_updated_at
  BEFORE UPDATE ON public.tax_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tax_model_periods_updated_at
  BEFORE UPDATE ON public.tax_model_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Seed data: 9 tax models
-- =============================================
INSERT INTO public.tax_models (model_code, description, period_type, category, display_order) VALUES
  ('303', 'Declaración de IVA', 'trimestral', 'iva', 1),
  ('420', 'Declaración de IGIC', 'trimestral', 'igic', 2),
  ('349', 'Operaciones intracomunitarias', 'trimestral', 'informativa', 3),
  ('369', 'IVA régimen OSS (Régimen de la Unión)', 'trimestral', 'iva', 4),
  ('130', 'IRPF estimación directa', 'trimestral', 'irpf', 5),
  ('115', 'Retenciones por capital inmobiliario', 'trimestral', 'irpf', 6),
  ('111', 'Retenciones e ingresos a cuenta del IRPF', 'trimestral', 'irpf', 7),
  ('190', 'Resumen anual de retenciones e ingresos a cuenta', 'anual', 'informativa', 8),
  ('200', 'Impuesto sobre Sociedades', 'anual', 'sociedades', 9);
