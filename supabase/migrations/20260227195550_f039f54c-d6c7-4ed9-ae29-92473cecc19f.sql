
-- ============================================================
-- MOTOR DE FINANCIACIÓN MVP
-- ============================================================

-- 1. finance_entities
CREATE TABLE public.finance_entities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can select finance_entities"
  ON public.finance_entities FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin can insert finance_entities"
  ON public.finance_entities FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin can update finance_entities"
  ON public.finance_entities FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin can delete finance_entities"
  ON public.finance_entities FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- 2. finance_products
CREATE TABLE public.finance_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL REFERENCES public.finance_entities(id),
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can select finance_products"
  ON public.finance_products FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin can insert finance_products"
  ON public.finance_products FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin can update finance_products"
  ON public.finance_products FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin can delete finance_products"
  ON public.finance_products FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- 3. finance_term_models
CREATE TABLE public.finance_term_models (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.finance_products(id),
  tin NUMERIC NOT NULL,
  term_months INTEGER NOT NULL,
  coefficient NUMERIC NOT NULL,
  additional_rate NUMERIC NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, tin, term_months)
);

ALTER TABLE public.finance_term_models ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can select finance_term_models"
  ON public.finance_term_models FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin can insert finance_term_models"
  ON public.finance_term_models FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin can update finance_term_models"
  ON public.finance_term_models FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "Admin can delete finance_term_models"
  ON public.finance_term_models FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- 4. finance_simulations
CREATE TABLE public.finance_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  buyer_id UUID REFERENCES public.buyers(id),
  sale_id UUID REFERENCES public.sales(id),
  term_model_id UUID NOT NULL REFERENCES public.finance_term_models(id),
  entity_name_snapshot TEXT NOT NULL,
  product_name_snapshot TEXT NOT NULL,
  tin_used NUMERIC NOT NULL,
  coefficient_used NUMERIC NOT NULL,
  additional_rate_used NUMERIC NOT NULL DEFAULT 0,
  financed_amount NUMERIC NOT NULL,
  adjusted_capital NUMERIC NOT NULL,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  monthly_payment NUMERIC NOT NULL,
  total_estimated NUMERIC NOT NULL,
  term_months_used INTEGER NOT NULL,
  first_payment_date DATE,
  status TEXT NOT NULL DEFAULT 'simulacion_interna',
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  pdf_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_simulations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can select all finance_simulations"
  ON public.finance_simulations FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'administrador') OR created_by = auth.uid());

CREATE POLICY "Authenticated can insert finance_simulations"
  ON public.finance_simulations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Admin or creator can update finance_simulations"
  ON public.finance_simulations FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador') OR created_by = auth.uid());

-- 5. finance_installments
CREATE TABLE public.finance_installments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  simulation_id UUID NOT NULL REFERENCES public.finance_simulations(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.finance_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Select finance_installments via simulation access"
  ON public.finance_installments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.finance_simulations fs
      WHERE fs.id = simulation_id
        AND (public.has_role(auth.uid(), 'administrador') OR fs.created_by = auth.uid())
    )
  );

CREATE POLICY "Admin can manage finance_installments"
  ON public.finance_installments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

-- ============================================================
-- TRIGGERS DE PROTECCIÓN
-- ============================================================

-- No borrar entidad si tiene productos
CREATE OR REPLACE FUNCTION public.fn_finance_entity_protect_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.finance_products WHERE entity_id = OLD.id) THEN
    RAISE EXCEPTION 'No se puede eliminar la entidad porque tiene productos asociados';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_finance_entity_protect_delete
  BEFORE DELETE ON public.finance_entities
  FOR EACH ROW EXECUTE FUNCTION public.fn_finance_entity_protect_delete();

-- No borrar producto si tiene modelos
CREATE OR REPLACE FUNCTION public.fn_finance_product_protect_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.finance_term_models WHERE product_id = OLD.id) THEN
    RAISE EXCEPTION 'No se puede eliminar el producto porque tiene modelos asociados';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_finance_product_protect_delete
  BEFORE DELETE ON public.finance_products
  FOR EACH ROW EXECUTE FUNCTION public.fn_finance_product_protect_delete();

-- No borrar modelo si tiene simulaciones
CREATE OR REPLACE FUNCTION public.fn_finance_term_model_protect_delete()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.finance_simulations WHERE term_model_id = OLD.id) THEN
    RAISE EXCEPTION 'No se puede eliminar el modelo porque tiene simulaciones asociadas';
  END IF;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_finance_term_model_protect_delete
  BEFORE DELETE ON public.finance_term_models
  FOR EACH ROW EXECUTE FUNCTION public.fn_finance_term_model_protect_delete();

-- Solo admin puede aprobar simulación
CREATE OR REPLACE FUNCTION public.fn_finance_simulation_approve_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Auto-update updated_at
  NEW.updated_at := now();

  -- Guard: only admin can set status to 'aprobada'
  IF NEW.status = 'aprobada' AND (OLD.status IS DISTINCT FROM 'aprobada') THEN
    IF NOT public.has_role(auth.uid(), 'administrador') THEN
      RAISE EXCEPTION 'Solo un administrador puede aprobar una simulación de financiación';
    END IF;
    NEW.approved_by := auth.uid();
    NEW.approved_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_finance_simulation_approve_guard
  BEFORE UPDATE ON public.finance_simulations
  FOR EACH ROW EXECUTE FUNCTION public.fn_finance_simulation_approve_guard();

-- ============================================================
-- FUNCIÓN RPC PARA GENERAR CUOTAS (IDEMPOTENTE)
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_generate_finance_installments(p_simulation_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_sim RECORD;
  i INTEGER;
BEGIN
  SELECT monthly_payment, term_months_used, first_payment_date
    INTO v_sim
    FROM public.finance_simulations
    WHERE id = p_simulation_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Simulación no encontrada: %', p_simulation_id;
  END IF;

  IF v_sim.first_payment_date IS NULL THEN
    RAISE EXCEPTION 'La simulación no tiene fecha de primera cuota';
  END IF;

  -- Delete existing installments
  DELETE FROM public.finance_installments WHERE simulation_id = p_simulation_id;

  -- Generate new installments
  FOR i IN 1..v_sim.term_months_used LOOP
    INSERT INTO public.finance_installments (simulation_id, installment_number, due_date, amount)
    VALUES (
      p_simulation_id,
      i,
      v_sim.first_payment_date + ((i - 1) * INTERVAL '1 month'),
      ROUND(v_sim.monthly_payment, 2)
    );
  END LOOP;
END;
$$;

-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER trg_finance_entities_updated_at
  BEFORE UPDATE ON public.finance_entities
  FOR EACH ROW EXECUTE FUNCTION public.fn_demands_updated_at();

CREATE TRIGGER trg_finance_products_updated_at
  BEFORE UPDATE ON public.finance_products
  FOR EACH ROW EXECUTE FUNCTION public.fn_demands_updated_at();

CREATE TRIGGER trg_finance_term_models_updated_at
  BEFORE UPDATE ON public.finance_term_models
  FOR EACH ROW EXECUTE FUNCTION public.fn_demands_updated_at();
