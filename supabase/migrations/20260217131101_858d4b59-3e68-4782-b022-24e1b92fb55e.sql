
-- Add created_from and owner_client_id columns to vehicles
ALTER TABLE public.vehicles
  ADD COLUMN IF NOT EXISTS created_from text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS owner_client_id uuid DEFAULT NULL REFERENCES public.buyers(id);

-- Add index for owner_client_id
CREATE INDEX IF NOT EXISTS idx_vehicles_owner_client_id ON public.vehicles(owner_client_id);
