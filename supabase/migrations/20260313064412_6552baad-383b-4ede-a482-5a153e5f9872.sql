
-- Email contact lists
CREATE TABLE public.email_contact_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_contact_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ecl_select" ON public.email_contact_lists FOR SELECT TO authenticated USING (true);
CREATE POLICY "ecl_insert" ON public.email_contact_lists FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ecl_update" ON public.email_contact_lists FOR UPDATE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "ecl_delete" ON public.email_contact_lists FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role));

-- Email contact list members
CREATE TABLE public.email_contact_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.email_contact_lists(id) ON DELETE CASCADE,
  buyer_id uuid REFERENCES public.buyers(id) ON DELETE SET NULL,
  email text NOT NULL,
  name text NOT NULL DEFAULT '',
  added_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_contact_list_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "eclm_select" ON public.email_contact_list_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "eclm_insert" ON public.email_contact_list_members FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.email_contact_lists WHERE id = list_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role)))
);
CREATE POLICY "eclm_delete" ON public.email_contact_list_members FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.email_contact_lists WHERE id = list_id AND (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role)))
);

-- Email campaigns
CREATE TABLE public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  list_id uuid REFERENCES public.email_contact_lists(id) ON DELETE SET NULL,
  name text NOT NULL,
  subject text NOT NULL DEFAULT '',
  preview_text text NOT NULL DEFAULT '',
  body_html text NOT NULL DEFAULT '',
  body_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft',
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ec_select" ON public.email_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "ec_insert" ON public.email_campaigns FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "ec_update" ON public.email_campaigns FOR UPDATE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role));
CREATE POLICY "ec_delete" ON public.email_campaigns FOR DELETE TO authenticated USING (user_id = auth.uid() OR has_role(auth.uid(), 'administrador'::app_role));

-- Updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_email_contact_lists_updated_at
  BEFORE UPDATE ON public.email_contact_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
