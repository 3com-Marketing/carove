ALTER TABLE smart_documents DROP CONSTRAINT smart_documents_document_type_check;
ALTER TABLE smart_documents ADD CONSTRAINT smart_documents_document_type_check
  CHECK (document_type = ANY (ARRAY['expense_invoice','vehicle_technical_sheet','circulation_permit']));