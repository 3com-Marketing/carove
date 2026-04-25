
-- Make vehicle-documents bucket private
UPDATE storage.buckets SET public = false WHERE id = 'vehicle-documents';

-- Storage policies for authenticated users on vehicle-documents
CREATE POLICY "Authenticated users can upload vehicle documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'vehicle-documents');

CREATE POLICY "Authenticated users can read vehicle documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'vehicle-documents');

CREATE POLICY "Authenticated users can delete vehicle documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'vehicle-documents');

CREATE POLICY "Authenticated users can update vehicle documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'vehicle-documents');
