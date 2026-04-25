-- Tabla 1: Objetivos de ventas
CREATE TABLE public.sales_objectives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period text NOT NULL,
  scope text NOT NULL CHECK (scope IN ('global','role','individual')),
  target_user_id uuid,
  target_role text,
  target_sales int NOT NULL DEFAULT 0,
  target_margin numeric NOT NULL DEFAULT 0,
  target_financed int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(period, scope, target_user_id, target_role)
);

-- Tabla 2: Historial de cambios
CREATE TABLE public.objective_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id uuid REFERENCES public.sales_objectives(id) ON DELETE CASCADE NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz DEFAULT now(),
  field_name text NOT NULL,
  old_value text,
  new_value text
);

-- Tabla 3: Escalones de incentivos
CREATE TABLE public.incentive_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('ventas','margen','financiacion')),
  threshold numeric NOT NULL,
  bonus_amount numeric NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla 4: Estadísticas mensuales (cache)
CREATE TABLE public.seller_monthly_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  period text NOT NULL,
  total_sales int DEFAULT 0,
  total_margin numeric DEFAULT 0,
  total_financed int DEFAULT 0,
  bonus_sales numeric DEFAULT 0,
  bonus_margin numeric DEFAULT 0,
  bonus_financed numeric DEFAULT 0,
  bonus_total numeric DEFAULT 0,
  last_recalc_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, period)
);

-- RLS
ALTER TABLE public.sales_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objective_change_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incentive_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seller_monthly_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_all_objectives" ON public.sales_objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all_change_log" ON public.objective_change_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all_tiers" ON public.incentive_tiers FOR SELECT TO authenticated USING (true);
CREATE POLICY "read_all_stats" ON public.seller_monthly_stats FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_objectives" ON public.sales_objectives FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin_update_objectives" ON public.sales_objectives FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin_delete_objectives" ON public.sales_objectives FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "admin_write_change_log" ON public.objective_change_log FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "admin_write_tiers" ON public.incentive_tiers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin_update_tiers" ON public.incentive_tiers FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));
CREATE POLICY "admin_delete_tiers" ON public.incentive_tiers FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "write_stats" ON public.seller_monthly_stats FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "update_stats" ON public.seller_monthly_stats FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Función de recálculo
CREATE OR REPLACE FUNCTION public.fn_recalc_seller_monthly_stats(p_user_id uuid, p_period text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_sales int;
  v_total_margin numeric;
  v_total_financed int;
  v_bonus_sales numeric := 0;
  v_bonus_margin numeric := 0;
  v_bonus_financed numeric := 0;
  v_month_start date;
  v_month_end date;
BEGIN
  v_month_start := (p_period || '-01')::date;
  v_month_end := (v_month_start + interval '1 month')::date;

  SELECT COUNT(*), COALESCE(SUM(v.net_profit), 0)
  INTO v_total_sales, v_total_margin
  FROM sales s
  JOIN vehicles v ON v.id = s.vehicle_id
  WHERE s.seller_id = p_user_id
    AND s.sale_date >= v_month_start
    AND s.sale_date < v_month_end;

  SELECT COUNT(DISTINCT s.id)
  INTO v_total_financed
  FROM sales s
  WHERE s.seller_id = p_user_id
    AND s.sale_date >= v_month_start
    AND s.sale_date < v_month_end
    AND s.finance_entity IS NOT NULL AND s.finance_entity != '';

  SELECT COALESCE(MAX(bonus_amount), 0) INTO v_bonus_sales
  FROM incentive_tiers WHERE category = 'ventas' AND threshold <= v_total_sales;

  SELECT COALESCE(MAX(bonus_amount), 0) INTO v_bonus_margin
  FROM incentive_tiers WHERE category = 'margen' AND threshold <= v_total_margin;

  SELECT COALESCE(MAX(bonus_amount), 0) INTO v_bonus_financed
  FROM incentive_tiers WHERE category = 'financiacion' AND threshold <= v_total_financed;

  INSERT INTO seller_monthly_stats (user_id, period, total_sales, total_margin, total_financed,
    bonus_sales, bonus_margin, bonus_financed, bonus_total, last_recalc_at)
  VALUES (p_user_id, p_period, v_total_sales, v_total_margin, v_total_financed,
    v_bonus_sales, v_bonus_margin, v_bonus_financed,
    v_bonus_sales + v_bonus_margin + v_bonus_financed, now())
  ON CONFLICT (user_id, period) DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_margin = EXCLUDED.total_margin,
    total_financed = EXCLUDED.total_financed,
    bonus_sales = EXCLUDED.bonus_sales,
    bonus_margin = EXCLUDED.bonus_margin,
    bonus_financed = EXCLUDED.bonus_financed,
    bonus_total = EXCLUDED.bonus_total,
    last_recalc_at = now();
END;
$$;
