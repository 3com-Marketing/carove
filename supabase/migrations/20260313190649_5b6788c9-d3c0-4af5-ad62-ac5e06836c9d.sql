
-- Table: ai_recommendations
CREATE TABLE public.ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'rendimiento',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  data_source text,
  estimated_impact text,
  recommended_action text,
  status text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid,
  reviewed_at timestamptz,
  metadata jsonb DEFAULT '{}'::jsonb
);

ALTER TABLE public.ai_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read ai_recommendations"
  ON public.ai_recommendations FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert ai_recommendations"
  ON public.ai_recommendations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update ai_recommendations"
  ON public.ai_recommendations FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Table: lead_assignments
CREATE TABLE public.lead_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  demand_id uuid REFERENCES public.demands(id) ON DELETE CASCADE NOT NULL,
  assigned_to uuid NOT NULL,
  assignment_mode text NOT NULL DEFAULT 'manual',
  reason text,
  is_automatic boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read lead_assignments"
  ON public.lead_assignments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert lead_assignments"
  ON public.lead_assignments FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));
