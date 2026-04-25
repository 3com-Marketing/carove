
-- Add document_number to reservation_documents
ALTER TABLE public.reservation_documents ADD COLUMN IF NOT EXISTS document_number text;

-- Create function for auto-numbering documents
CREATE OR REPLACE FUNCTION public.fn_assign_document_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year int;
  v_seq int;
  v_prefix text;
BEGIN
  -- Only assign numbers to sales_contract and proforma_invoice
  IF NEW.document_type NOT IN ('sales_contract', 'proforma_invoice') THEN
    RETURN NEW;
  END IF;

  IF NEW.document_type = 'sales_contract' THEN
    v_prefix := 'CV';
  ELSE
    v_prefix := 'PF';
  END IF;

  v_year := EXTRACT(YEAR FROM now());

  SELECT COALESCE(MAX(
    NULLIF(SPLIT_PART(document_number, '-', 3), '')::int
  ), 0) + 1
  INTO v_seq
  FROM public.reservation_documents
  WHERE document_type = NEW.document_type
    AND document_number LIKE v_prefix || '-' || v_year || '-%';

  NEW.document_number := v_prefix || '-' || v_year || '-' || LPAD(v_seq::text, 4, '0');

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trg_assign_document_number ON public.reservation_documents;
CREATE TRIGGER trg_assign_document_number
  BEFORE INSERT ON public.reservation_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_assign_document_number();
