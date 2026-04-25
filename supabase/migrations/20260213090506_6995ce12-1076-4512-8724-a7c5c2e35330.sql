CREATE TABLE public.pdf_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  user_id uuid NOT NULL,
  report_type text NOT NULL,
  report_params jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '120 seconds'),
  consumed boolean NOT NULL DEFAULT false
);

ALTER TABLE public.pdf_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access" ON public.pdf_tickets FOR ALL USING (false);