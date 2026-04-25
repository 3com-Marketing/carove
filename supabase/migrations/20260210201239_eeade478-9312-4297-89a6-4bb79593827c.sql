
-- Allow authenticated users to update document metadata (name, category)
CREATE POLICY "Documents updatable by authenticated"
ON public.documents
FOR UPDATE
USING (true)
WITH CHECK (true);
