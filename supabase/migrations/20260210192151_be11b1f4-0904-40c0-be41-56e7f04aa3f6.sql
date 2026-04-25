
-- Add new CRM fields to buyers table
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS invoice_number text DEFAULT NULL;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS invoice_date timestamp with time zone DEFAULT NULL;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS client_code text DEFAULT NULL;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS city text DEFAULT NULL;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS postal_code text DEFAULT NULL;
ALTER TABLE public.buyers ADD COLUMN IF NOT EXISTS province text DEFAULT NULL;

-- Add sold_by field to vehicles table (for commissions tracking)
ALTER TABLE public.vehicles ADD COLUMN IF NOT EXISTS sold_by text DEFAULT NULL;
