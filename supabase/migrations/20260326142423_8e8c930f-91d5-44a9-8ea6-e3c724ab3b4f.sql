CREATE TABLE public.vehicle_purchase_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL REFERENCES public.vehicle_purchases(id),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id),
  contract_number text,
  company_snapshot jsonb NOT NULL DEFAULT '{}',
  seller_snapshot jsonb NOT NULL DEFAULT '{}',
  vehicle_snapshot jsonb NOT NULL DEFAULT '{}',
  pricing_snapshot jsonb NOT NULL DEFAULT '{}',
  html_content text,
  generated_at timestamptz DEFAULT now(),
  generated_by uuid,
  status text NOT NULL DEFAULT 'borrador',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.vehicle_purchase_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can manage purchase contracts"
  ON public.vehicle_purchase_contracts FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER tr_purchase_contracts_updated_at
  BEFORE UPDATE ON public.vehicle_purchase_contracts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();