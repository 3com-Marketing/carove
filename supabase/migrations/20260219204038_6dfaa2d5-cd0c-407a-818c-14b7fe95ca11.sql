
-- Table for commercial activities
CREATE TABLE public.commercial_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL DEFAULT '',
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  activity_date timestamptz NOT NULL DEFAULT now(),
  channel text NOT NULL,
  subject text NOT NULL,
  result text NOT NULL,
  follow_up_days integer,
  follow_up_date timestamptz,
  observations text NOT NULL,
  vehicle_id uuid REFERENCES public.vehicles(id),
  sale_id uuid REFERENCES public.sales(id),
  reservation_id uuid REFERENCES public.reservations(id),
  status text NOT NULL DEFAULT 'activa',
  cancelled_reason text,
  cancelled_at timestamptz,
  cancelled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commercial_activities ENABLE ROW LEVEL SECURITY;

-- SELECT: owner or admin
CREATE POLICY "Activities viewable by owner or admin"
  ON public.commercial_activities FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'));

-- INSERT: any authenticated
CREATE POLICY "Activities insertable by authenticated"
  ON public.commercial_activities FOR INSERT TO authenticated
  WITH CHECK (true);

-- UPDATE: only owner
CREATE POLICY "Activities updatable by owner"
  ON public.commercial_activities FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

-- No DELETE policy = cannot delete

-- Indexes
CREATE INDEX idx_commercial_activities_buyer ON public.commercial_activities(buyer_id);
CREATE INDEX idx_commercial_activities_user ON public.commercial_activities(user_id);
CREATE INDEX idx_commercial_activities_date ON public.commercial_activities(activity_date DESC);
CREATE INDEX idx_commercial_activities_follow_up ON public.commercial_activities(follow_up_date) WHERE follow_up_date IS NOT NULL AND status = 'activa';

-- Updated_at trigger
CREATE TRIGGER update_commercial_activities_updated_at
  BEFORE UPDATE ON public.commercial_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Audit trigger (reuse existing function)
CREATE TRIGGER audit_commercial_activities
  AFTER INSERT OR UPDATE ON public.commercial_activities
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();
