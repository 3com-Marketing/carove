
-- Add iban and logo_url columns to company_settings
ALTER TABLE public.company_settings ADD COLUMN iban TEXT;
ALTER TABLE public.company_settings ADD COLUMN logo_url TEXT;

-- Create company-assets bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('company-assets', 'company-assets', false);

-- Storage policies: admins can upload/update/delete
CREATE POLICY "Admins can upload company assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admins can update company assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Admins can delete company assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'company-assets' AND public.has_role(auth.uid(), 'administrador'::app_role));

-- Authenticated users can read company assets
CREATE POLICY "Authenticated can read company assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'company-assets' AND auth.uid() IS NOT NULL);
