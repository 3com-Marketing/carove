
-- Create proposals table for tracking generated proposals
CREATE TABLE public.proposals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  proposal_type TEXT NOT NULL DEFAULT 'compra',
  buyer_name TEXT NOT NULL DEFAULT '',
  buyer_iban TEXT,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_by_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Proposals viewable by authenticated"
ON public.proposals FOR SELECT USING (true);

CREATE POLICY "Proposals insertable by authenticated"
ON public.proposals FOR INSERT WITH CHECK (true);

CREATE POLICY "Proposals deletable by authenticated"
ON public.proposals FOR DELETE USING (true);

-- Audit trigger
CREATE TRIGGER audit_proposals
  AFTER INSERT OR UPDATE OR DELETE ON public.proposals
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
