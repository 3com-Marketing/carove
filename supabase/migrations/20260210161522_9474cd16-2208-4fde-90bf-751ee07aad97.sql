
-- ══════════════════════════════════════════════════════════
-- 1. AUDIT LOGS TABLE
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
CREATE POLICY "Admins can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.has_role(auth.uid(), 'administrador'));

-- System inserts via trigger (SECURITY DEFINER), so we need a permissive insert for the trigger function
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_audit_logs_table_record ON public.audit_logs (table_name, record_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- ══════════════════════════════════════════════════════════
-- 2. AUDIT TRIGGER FUNCTION
-- ══════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.audit_trigger_func()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, new_data)
    VALUES (auth.uid(), 'INSERT', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data, new_data)
    VALUES (auth.uid(), 'UPDATE', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, table_name, record_id, old_data)
    VALUES (auth.uid(), 'DELETE', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- ══════════════════════════════════════════════════════════
-- 3. ATTACH TRIGGERS TO CORE TABLES
-- ══════════════════════════════════════════════════════════
CREATE TRIGGER audit_vehicles
  AFTER INSERT OR UPDATE OR DELETE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_expenses
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_notes
  AFTER INSERT ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

CREATE TRIGGER audit_after_sale_tickets
  AFTER INSERT OR UPDATE OR DELETE ON public.after_sale_tickets
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();

-- ══════════════════════════════════════════════════════════
-- 4. BUYERS TABLE (CRM)
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  dni text,
  phone text,
  email text,
  address text,
  iban text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers viewable by authenticated"
  ON public.buyers FOR SELECT USING (true);

CREATE POLICY "Buyers insertable by authenticated"
  ON public.buyers FOR INSERT WITH CHECK (true);

CREATE POLICY "Buyers updatable by authenticated"
  ON public.buyers FOR UPDATE USING (true);

CREATE POLICY "Buyers deletable by admins"
  ON public.buyers FOR DELETE
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE TRIGGER update_buyers_updated_at
  BEFORE UPDATE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add FK from vehicles to buyers
ALTER TABLE public.vehicles
  ADD CONSTRAINT vehicles_buyer_id_fkey
  FOREIGN KEY (buyer_id) REFERENCES public.buyers(id) ON DELETE SET NULL;

-- Audit trigger on buyers too
CREATE TRIGGER audit_buyers
  AFTER INSERT OR UPDATE OR DELETE ON public.buyers
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_func();
