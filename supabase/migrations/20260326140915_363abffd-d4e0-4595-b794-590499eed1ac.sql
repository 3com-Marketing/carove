
-- Add is_internal field to suppliers
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS is_internal boolean NOT NULL DEFAULT false;

-- Create "Taller interno" supplier if not exists
INSERT INTO public.suppliers (name, phone, is_internal, active, specialty)
SELECT 'Taller interno', '', true, true, 'Taller propio'
WHERE NOT EXISTS (SELECT 1 FROM public.suppliers WHERE is_internal = true);
