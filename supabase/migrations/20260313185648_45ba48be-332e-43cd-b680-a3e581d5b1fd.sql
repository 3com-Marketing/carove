
-- Tabla 1: Niveles comerciales (gamificación)
CREATE TABLE public.commercial_levels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  min_points numeric NOT NULL DEFAULT 0,
  bonus_multiplier numeric NOT NULL DEFAULT 1,
  lead_priority int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla 2: Reglas de puntos configurables
CREATE TABLE public.point_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  points numeric NOT NULL DEFAULT 0,
  threshold numeric NOT NULL DEFAULT 0,
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla 3: Rappels financieros por entidad
CREATE TABLE public.finance_rappels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_name text NOT NULL,
  threshold_volume numeric NOT NULL DEFAULT 0,
  rappel_percent numeric NOT NULL DEFAULT 0,
  period_type text NOT NULL DEFAULT 'mensual',
  created_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ampliar seller_monthly_stats con columnas de puntos y nivel
ALTER TABLE public.seller_monthly_stats
  ADD COLUMN IF NOT EXISTS total_points numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level_name text;

-- RLS para commercial_levels
ALTER TABLE public.commercial_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON public.commercial_levels FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write" ON public.commercial_levels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- RLS para point_rules
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON public.point_rules FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write" ON public.point_rules FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- RLS para finance_rappels
ALTER TABLE public.finance_rappels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_all" ON public.finance_rappels FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_write" ON public.finance_rappels FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'))
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

-- Actualizar función de recálculo para incluir puntos y nivel
CREATE OR REPLACE FUNCTION public.fn_recalc_seller_monthly_stats(p_user_id uuid, p_period text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_total_sales int;
  v_total_margin numeric;
  v_total_financed int;
  v_bonus_sales numeric := 0;
  v_bonus_margin numeric := 0;
  v_bonus_financed numeric := 0;
  v_total_points numeric := 0;
  v_level_name text := NULL;
  v_month_start date;
  v_month_end date;
  v_rule record;
  v_margin_threshold numeric;
BEGIN
  v_month_start := (p_period || '-01')::date;
  v_month_end := (v_month_start + interval '1 month')::date;

  -- Count sales and margin
  SELECT COUNT(*), COALESCE(SUM(v.net_profit), 0)
  INTO v_total_sales, v_total_margin
  FROM sales s
  JOIN vehicles v ON v.id = s.vehicle_id
  WHERE s.seller_id = p_user_id
    AND s.sale_date >= v_month_start
    AND s.sale_date < v_month_end;

  -- Count financed operations
  SELECT COUNT(DISTINCT s.id)
  INTO v_total_financed
  FROM sales s
  WHERE s.seller_id = p_user_id
    AND s.sale_date >= v_month_start
    AND s.sale_date < v_month_end
    AND s.finance_entity IS NOT NULL AND s.finance_entity != '';

  -- Calculate bonuses from tiers
  SELECT COALESCE(MAX(bonus_amount), 0) INTO v_bonus_sales
  FROM incentive_tiers WHERE category = 'ventas' AND threshold <= v_total_sales;

  SELECT COALESCE(MAX(bonus_amount), 0) INTO v_bonus_margin
  FROM incentive_tiers WHERE category = 'margen' AND threshold <= v_total_margin;

  SELECT COALESCE(MAX(bonus_amount), 0) INTO v_bonus_financed
  FROM incentive_tiers WHERE category = 'financiacion' AND threshold <= v_total_financed;

  -- Calculate points from point_rules
  FOR v_rule IN SELECT * FROM point_rules LOOP
    IF v_rule.action = 'venta' THEN
      v_total_points := v_total_points + (v_total_sales * v_rule.points);
    ELSIF v_rule.action = 'financiacion' THEN
      v_total_points := v_total_points + (v_total_financed * v_rule.points);
    ELSIF v_rule.action = 'margen_superior' THEN
      -- Count sales where individual margin > threshold
      SELECT COUNT(*) INTO v_margin_threshold
      FROM sales s
      JOIN vehicles v ON v.id = s.vehicle_id
      WHERE s.seller_id = p_user_id
        AND s.sale_date >= v_month_start
        AND s.sale_date < v_month_end
        AND v.net_profit > v_rule.threshold;
      v_total_points := v_total_points + (v_margin_threshold * v_rule.points);
    END IF;
  END LOOP;

  -- Resolve level from commercial_levels
  SELECT name INTO v_level_name
  FROM commercial_levels
  WHERE min_points <= v_total_points
  ORDER BY min_points DESC
  LIMIT 1;

  -- Upsert stats
  INSERT INTO seller_monthly_stats (user_id, period, total_sales, total_margin, total_financed,
    bonus_sales, bonus_margin, bonus_financed, bonus_total, total_points, level_name, last_recalc_at)
  VALUES (p_user_id, p_period, v_total_sales, v_total_margin, v_total_financed,
    v_bonus_sales, v_bonus_margin, v_bonus_financed,
    v_bonus_sales + v_bonus_margin + v_bonus_financed, v_total_points, v_level_name, now())
  ON CONFLICT (user_id, period) DO UPDATE SET
    total_sales = EXCLUDED.total_sales,
    total_margin = EXCLUDED.total_margin,
    total_financed = EXCLUDED.total_financed,
    bonus_sales = EXCLUDED.bonus_sales,
    bonus_margin = EXCLUDED.bonus_margin,
    bonus_financed = EXCLUDED.bonus_financed,
    bonus_total = EXCLUDED.bonus_total,
    total_points = EXCLUDED.total_points,
    level_name = EXCLUDED.level_name,
    last_recalc_at = now();
END;
$$;
