
-- ══════════════════════════════════════════════════════════
-- 1. DOCUMENTS TABLE
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'otro',
  filename text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  mime_type text,
  uploaded_by uuid NOT NULL,
  uploaded_by_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documents viewable by authenticated"
  ON public.documents FOR SELECT USING (true);

CREATE POLICY "Documents insertable by authenticated"
  ON public.documents FOR INSERT WITH CHECK (true);

CREATE POLICY "Documents deletable by authenticated"
  ON public.documents FOR DELETE USING (true);

CREATE INDEX idx_documents_vehicle ON public.documents(vehicle_id);

-- Audit trigger
CREATE TRIGGER audit_documents
  AFTER INSERT OR DELETE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ══════════════════════════════════════════════════════════
-- 2. STORAGE BUCKET FOR VEHICLE DOCUMENTS
-- ══════════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public) VALUES ('vehicle-documents', 'vehicle-documents', true);

-- Storage policies
CREATE POLICY "Vehicle docs publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'vehicle-documents');

CREATE POLICY "Authenticated users can upload vehicle docs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'vehicle-documents');

CREATE POLICY "Authenticated users can delete vehicle docs"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'vehicle-documents');
