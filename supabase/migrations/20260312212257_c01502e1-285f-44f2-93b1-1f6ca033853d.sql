
-- ========================================
-- ENUMS for Postventa module
-- ========================================

CREATE TYPE public.pv_followup_type AS ENUM (
  'llamada', 'whatsapp', 'email', 'revision_satisfaccion', 'recordatorio',
  'gestion_documental', 'incidencia', 'reclamacion', 'financiacion', 'revision_mantenimiento'
);

CREATE TYPE public.pv_followup_status AS ENUM ('pendiente', 'realizado', 'en_espera', 'cerrado');

CREATE TYPE public.pv_incident_type AS ENUM (
  'averia', 'ruido', 'fallo_electronico', 'problema_documental',
  'problema_comercial', 'incidencia_entrega', 'mantenimiento', 'otro'
);

CREATE TYPE public.pv_severity AS ENUM ('leve', 'media', 'alta', 'urgente');

CREATE TYPE public.pv_incident_status AS ENUM (
  'abierta', 'en_revision', 'diagnosticando', 'en_reparacion', 'pendiente_cliente', 'cerrada'
);

CREATE TYPE public.pv_repair_status AS ENUM ('pendiente', 'en_curso', 'esperando_piezas', 'finalizada', 'cancelada');

CREATE TYPE public.pv_claim_type AS ENUM (
  'garantia', 'documentacion', 'comercial', 'financiacion', 'publicidad', 'atencion_cliente', 'otro'
);

CREATE TYPE public.pv_claim_status AS ENUM ('abierta', 'en_revision', 'resuelta', 'rechazada');

CREATE TYPE public.pv_finance_incident_status AS ENUM ('abierta', 'en_gestion', 'resuelta', 'cerrada');

-- ========================================
-- TABLES
-- ========================================

-- pv_followups
CREATE TABLE public.pv_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  vehicle_id uuid REFERENCES public.vehicles(id),
  buyer_id uuid REFERENCES public.buyers(id) NOT NULL,
  assigned_to uuid NOT NULL,
  assigned_to_name text NOT NULL DEFAULT '',
  followup_type public.pv_followup_type NOT NULL,
  scheduled_date date NOT NULL,
  completed_date date,
  status public.pv_followup_status NOT NULL DEFAULT 'pendiente',
  notes text DEFAULT '',
  result text DEFAULT '',
  next_action text DEFAULT '',
  next_followup_date date,
  is_auto_generated boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- pv_warranties
CREATE TABLE public.pv_warranties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) NOT NULL,
  buyer_id uuid REFERENCES public.buyers(id) NOT NULL,
  sale_id uuid REFERENCES public.sales(id),
  warranty_type text NOT NULL DEFAULT 'interna',
  provider text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  coverage_description text DEFAULT '',
  exclusions text DEFAULT '',
  policy_document_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- pv_incidents
CREATE TABLE public.pv_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  vehicle_id uuid REFERENCES public.vehicles(id) NOT NULL,
  buyer_id uuid REFERENCES public.buyers(id) NOT NULL,
  warranty_id uuid REFERENCES public.pv_warranties(id),
  incident_type public.pv_incident_type NOT NULL DEFAULT 'otro',
  severity public.pv_severity NOT NULL DEFAULT 'media',
  status public.pv_incident_status NOT NULL DEFAULT 'abierta',
  description text NOT NULL DEFAULT '',
  assigned_to uuid NOT NULL,
  assigned_to_name text NOT NULL DEFAULT '',
  internal_notes text DEFAULT '',
  warranty_covered boolean,
  repair_id uuid,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- pv_repairs
CREATE TABLE public.pv_repairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid REFERENCES public.pv_incidents(id),
  vehicle_id uuid REFERENCES public.vehicles(id) NOT NULL,
  buyer_id uuid REFERENCES public.buyers(id) NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id),
  diagnosis text DEFAULT '',
  estimated_cost numeric(12,2) DEFAULT 0,
  final_cost numeric(12,2) DEFAULT 0,
  cost_company numeric(12,2) DEFAULT 0,
  cost_warranty numeric(12,2) DEFAULT 0,
  cost_client numeric(12,2) DEFAULT 0,
  entry_date date,
  exit_date date,
  status public.pv_repair_status NOT NULL DEFAULT 'pendiente',
  observations text DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Add FK from pv_incidents.repair_id to pv_repairs
ALTER TABLE public.pv_incidents
  ADD CONSTRAINT pv_incidents_repair_id_fkey FOREIGN KEY (repair_id) REFERENCES public.pv_repairs(id);

-- pv_repair_parts
CREATE TABLE public.pv_repair_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  repair_id uuid REFERENCES public.pv_repairs(id) ON DELETE CASCADE NOT NULL,
  part_name text NOT NULL,
  supplier_id uuid REFERENCES public.suppliers(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_cost numeric(12,2) NOT NULL DEFAULT 0,
  total_cost numeric(12,2) NOT NULL DEFAULT 0,
  warranty_months integer DEFAULT 0,
  observations text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- pv_reviews
CREATE TABLE public.pv_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) NOT NULL,
  buyer_id uuid REFERENCES public.buyers(id) NOT NULL,
  sale_id uuid REFERENCES public.sales(id),
  review_type text NOT NULL DEFAULT 'revision_cortesia',
  review_date date NOT NULL,
  cost numeric(12,2) DEFAULT 0,
  company_assumed boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  assigned_to uuid,
  assigned_to_name text DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- pv_claims
CREATE TABLE public.pv_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  vehicle_id uuid REFERENCES public.vehicles(id) NOT NULL,
  buyer_id uuid REFERENCES public.buyers(id) NOT NULL,
  claim_type public.pv_claim_type NOT NULL DEFAULT 'otro',
  status public.pv_claim_status NOT NULL DEFAULT 'abierta',
  description text NOT NULL DEFAULT '',
  resolution text DEFAULT '',
  compensation_amount numeric(12,2) DEFAULT 0,
  assigned_to uuid NOT NULL,
  assigned_to_name text NOT NULL DEFAULT '',
  created_by uuid NOT NULL,
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- pv_finance_incidents
CREATE TABLE public.pv_finance_incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES public.sales(id),
  vehicle_id uuid REFERENCES public.vehicles(id) NOT NULL,
  buyer_id uuid REFERENCES public.buyers(id) NOT NULL,
  finance_entity_name text NOT NULL DEFAULT '',
  problem_type text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status public.pv_finance_incident_status NOT NULL DEFAULT 'abierta',
  assigned_to uuid NOT NULL,
  assigned_to_name text NOT NULL DEFAULT '',
  resolution text DEFAULT '',
  internal_notes text DEFAULT '',
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- pv_attachments
CREATE TABLE public.pv_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size integer DEFAULT 0,
  mime_type text DEFAULT '',
  uploaded_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========================================
-- RLS
-- ========================================

ALTER TABLE public.pv_followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_warranties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_repairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_repair_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_finance_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pv_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT for all authenticated
CREATE POLICY "pv_followups_select" ON public.pv_followups FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_followups_insert" ON public.pv_followups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pv_followups_update" ON public.pv_followups FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pv_followups_delete" ON public.pv_followups FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "pv_warranties_select" ON public.pv_warranties FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_warranties_insert" ON public.pv_warranties FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pv_warranties_update" ON public.pv_warranties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pv_warranties_delete" ON public.pv_warranties FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "pv_incidents_select" ON public.pv_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_incidents_insert" ON public.pv_incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pv_incidents_update" ON public.pv_incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pv_incidents_delete" ON public.pv_incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "pv_repairs_select" ON public.pv_repairs FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_repairs_insert" ON public.pv_repairs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pv_repairs_update" ON public.pv_repairs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pv_repairs_delete" ON public.pv_repairs FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "pv_repair_parts_select" ON public.pv_repair_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_repair_parts_insert" ON public.pv_repair_parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pv_repair_parts_update" ON public.pv_repair_parts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pv_repair_parts_delete" ON public.pv_repair_parts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "pv_reviews_select" ON public.pv_reviews FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_reviews_insert" ON public.pv_reviews FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pv_reviews_update" ON public.pv_reviews FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pv_reviews_delete" ON public.pv_reviews FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "pv_claims_select" ON public.pv_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_claims_insert" ON public.pv_claims FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pv_claims_update" ON public.pv_claims FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pv_claims_delete" ON public.pv_claims FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "pv_finance_incidents_select" ON public.pv_finance_incidents FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_finance_incidents_insert" ON public.pv_finance_incidents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pv_finance_incidents_update" ON public.pv_finance_incidents FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pv_finance_incidents_delete" ON public.pv_finance_incidents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "pv_attachments_select" ON public.pv_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "pv_attachments_insert" ON public.pv_attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pv_attachments_update" ON public.pv_attachments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pv_attachments_delete" ON public.pv_attachments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

-- ========================================
-- TRIGGER: Auto-generate followups on sale completion
-- ========================================

CREATE OR REPLACE FUNCTION public.fn_pv_auto_followups_on_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only when vehicle status changes to 'entregado' via a sale
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    -- Check vehicle is now entregado
    IF EXISTS (
      SELECT 1 FROM public.vehicles WHERE id = NEW.vehicle_id AND status = 'entregado'
    ) THEN
      -- Only create if no auto followups exist for this sale
      IF NOT EXISTS (
        SELECT 1 FROM public.pv_followups WHERE sale_id = NEW.id AND is_auto_generated = true
      ) THEN
        -- +7 days
        INSERT INTO public.pv_followups (sale_id, vehicle_id, buyer_id, assigned_to, assigned_to_name, followup_type, scheduled_date, is_auto_generated, created_by, notes)
        VALUES (NEW.id, NEW.vehicle_id, NEW.buyer_id, NEW.seller_id, '', 'llamada', CURRENT_DATE + 7, true, NEW.seller_id, 'Seguimiento automático: 7 días post-entrega');

        -- +30 days
        INSERT INTO public.pv_followups (sale_id, vehicle_id, buyer_id, assigned_to, assigned_to_name, followup_type, scheduled_date, is_auto_generated, created_by, notes)
        VALUES (NEW.id, NEW.vehicle_id, NEW.buyer_id, NEW.seller_id, '', 'revision_satisfaccion', CURRENT_DATE + 30, true, NEW.seller_id, 'Seguimiento automático: 30 días post-entrega');

        -- +180 days
        INSERT INTO public.pv_followups (sale_id, vehicle_id, buyer_id, assigned_to, assigned_to_name, followup_type, scheduled_date, is_auto_generated, created_by, notes)
        VALUES (NEW.id, NEW.vehicle_id, NEW.buyer_id, NEW.seller_id, '', 'revision_mantenimiento', CURRENT_DATE + 180, true, NEW.seller_id, 'Seguimiento automático: 6 meses post-entrega');
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pv_auto_followups
  AFTER INSERT OR UPDATE ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pv_auto_followups_on_sale();

-- ========================================
-- TRIGGER: Auto-calculate pv_repair_parts total_cost
-- ========================================

CREATE OR REPLACE FUNCTION public.fn_pv_repair_part_calc()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.total_cost := ROUND(NEW.quantity * NEW.unit_cost, 2);
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pv_repair_part_calc
  BEFORE INSERT OR UPDATE ON public.pv_repair_parts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_pv_repair_part_calc();

-- ========================================
-- TRIGGER: updated_at for pv tables
-- ========================================

CREATE OR REPLACE FUNCTION public.fn_pv_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pv_followups_updated_at BEFORE UPDATE ON public.pv_followups FOR EACH ROW EXECUTE FUNCTION public.fn_pv_updated_at();
CREATE TRIGGER trg_pv_warranties_updated_at BEFORE UPDATE ON public.pv_warranties FOR EACH ROW EXECUTE FUNCTION public.fn_pv_updated_at();
CREATE TRIGGER trg_pv_incidents_updated_at BEFORE UPDATE ON public.pv_incidents FOR EACH ROW EXECUTE FUNCTION public.fn_pv_updated_at();
CREATE TRIGGER trg_pv_repairs_updated_at BEFORE UPDATE ON public.pv_repairs FOR EACH ROW EXECUTE FUNCTION public.fn_pv_updated_at();
CREATE TRIGGER trg_pv_reviews_updated_at BEFORE UPDATE ON public.pv_reviews FOR EACH ROW EXECUTE FUNCTION public.fn_pv_updated_at();
CREATE TRIGGER trg_pv_claims_updated_at BEFORE UPDATE ON public.pv_claims FOR EACH ROW EXECUTE FUNCTION public.fn_pv_updated_at();
CREATE TRIGGER trg_pv_finance_incidents_updated_at BEFORE UPDATE ON public.pv_finance_incidents FOR EACH ROW EXECUTE FUNCTION public.fn_pv_updated_at();

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('pv-attachments', 'pv-attachments', false);

CREATE POLICY "pv_attachments_storage_select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'pv-attachments');
CREATE POLICY "pv_attachments_storage_insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pv-attachments');
CREATE POLICY "pv_attachments_storage_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'pv-attachments' AND public.has_role(auth.uid(), 'administrador'));
