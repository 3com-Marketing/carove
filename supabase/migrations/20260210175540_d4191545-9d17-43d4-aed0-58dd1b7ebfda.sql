
-- Create module_requests table
CREATE TABLE public.module_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  complexity TEXT NOT NULL DEFAULT 'M',
  budget_min NUMERIC NOT NULL DEFAULT 0,
  budget_max NUMERIC NOT NULL DEFAULT 0,
  timeline TEXT,
  conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'aprobado', 'rechazado')),
  requested_by TEXT NOT NULL,
  requested_by_name TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.module_requests ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view requests
CREATE POLICY "Authenticated users can view module requests"
  ON public.module_requests FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Users can create their own requests
CREATE POLICY "Users can create module requests"
  ON public.module_requests FOR INSERT
  WITH CHECK (auth.uid()::text = requested_by);

-- Admins can update any request (for approval/rejection)
CREATE POLICY "Authenticated users can update module requests"
  ON public.module_requests FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Timestamp trigger
CREATE TRIGGER update_module_requests_updated_at
  BEFORE UPDATE ON public.module_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
