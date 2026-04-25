
CREATE TABLE public.market_comparisons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id),
  appraisal_id uuid,
  search_criteria jsonb NOT NULL,
  comparables jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_comparables integer NOT NULL DEFAULT 0,
  precio_medio numeric NOT NULL DEFAULT 0,
  mediana numeric NOT NULL DEFAULT 0,
  percentil_25 numeric NOT NULL DEFAULT 0,
  percentil_75 numeric NOT NULL DEFAULT 0,
  competencia text NOT NULL DEFAULT 'media',
  valor_sugerido numeric NOT NULL DEFAULT 0,
  valor_final_aplicado numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.market_comparisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Market comparisons viewable by authenticated"
  ON public.market_comparisons FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Market comparisons insertable by authenticated"
  ON public.market_comparisons FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Market comparisons updatable by authenticated"
  ON public.market_comparisons FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Market comparisons deletable by admins"
  ON public.market_comparisons FOR DELETE
  USING (has_role(auth.uid(), 'administrador'::app_role));
