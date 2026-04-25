
-- Table: smart_documents
CREATE TABLE public.smart_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type text NOT NULL CHECK (document_type IN ('expense_invoice', 'vehicle_technical_sheet')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  extracted_data jsonb NOT NULL DEFAULT '{}',
  extraction_meta jsonb NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed')),
  linked_entity_type text,
  linked_entity_id uuid,
  linked_vehicle_id uuid,
  uploaded_by uuid NOT NULL,
  uploaded_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz
);

ALTER TABLE public.smart_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view own docs"
  ON public.smart_documents FOR SELECT
  USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Owner can insert docs"
  ON public.smart_documents FOR INSERT
  WITH CHECK (uploaded_by = auth.uid());

CREATE POLICY "Owner can update own docs"
  ON public.smart_documents FOR UPDATE
  USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role));

CREATE POLICY "Owner can delete own docs"
  ON public.smart_documents FOR DELETE
  USING (uploaded_by = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role));

-- Bucket: smart-documents (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('smart-documents', 'smart-documents', false);

CREATE POLICY "Owner upload smart docs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'smart-documents'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Owner read smart docs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'smart-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR has_role(auth.uid(), 'administrador'::app_role)
    )
  );

CREATE POLICY "Owner delete smart docs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'smart-documents'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR has_role(auth.uid(), 'administrador'::app_role)
    )
  );
