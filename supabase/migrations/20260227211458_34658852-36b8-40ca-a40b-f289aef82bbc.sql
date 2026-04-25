
-- 1. Add commission_percent to finance_products
ALTER TABLE public.finance_products
ADD COLUMN commission_percent NUMERIC(5,2) NOT NULL DEFAULT 2.00;

-- 2. Add financing columns to proposals
ALTER TABLE public.proposals ADD COLUMN down_payment NUMERIC NULL;
ALTER TABLE public.proposals ADD COLUMN financed_amount NUMERIC NULL;
ALTER TABLE public.proposals ADD COLUMN finance_term_model_id UUID NULL REFERENCES public.finance_term_models(id);
ALTER TABLE public.proposals ADD COLUMN monthly_payment NUMERIC NULL;
ALTER TABLE public.proposals ADD COLUMN total_financed NUMERIC NULL;
ALTER TABLE public.proposals ADD COLUMN commission_estimated NUMERIC NULL;
ALTER TABLE public.proposals ADD COLUMN internal_flag TEXT NULL;
