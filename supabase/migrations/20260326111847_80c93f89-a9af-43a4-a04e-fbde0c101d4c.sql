
-- Cash sessions table
CREATE TABLE public.cash_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_date date NOT NULL DEFAULT CURRENT_DATE,
  opened_by uuid NOT NULL,
  opened_by_name text NOT NULL DEFAULT '',
  opened_at timestamptz NOT NULL DEFAULT now(),
  opening_balance numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'abierta',
  notes text,
  closed_at timestamptz,
  closed_by uuid,
  closed_by_name text,
  closing_balance numeric(12,2),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(session_date)
);

-- Cash session movements table
CREATE TABLE public.cash_session_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cash_sessions(id),
  movement_type text NOT NULL,
  payment_method text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  concept text NOT NULL,
  amount numeric(12,2) NOT NULL,
  client_id uuid,
  vehicle_id uuid,
  created_by uuid NOT NULL,
  created_by_name text NOT NULL DEFAULT '',
  movement_datetime timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Validation trigger for cash_sessions status
CREATE OR REPLACE FUNCTION public.fn_validate_cash_session_status()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status NOT IN ('abierta', 'cerrada') THEN
    RAISE EXCEPTION 'Estado de caja no válido: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cash_session_status
  BEFORE INSERT OR UPDATE ON public.cash_sessions
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_cash_session_status();

-- Validation trigger for movement_type
CREATE OR REPLACE FUNCTION public.fn_validate_cash_session_movement()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF NEW.movement_type NOT IN ('ingreso', 'gasto') THEN
    RAISE EXCEPTION 'Tipo de movimiento no válido: %', NEW.movement_type;
  END IF;
  IF NEW.payment_method NOT IN ('efectivo', 'tpv', 'transferencia', 'bizum') THEN
    RAISE EXCEPTION 'Método de pago no válido: %', NEW.payment_method;
  END IF;
  IF NEW.amount <= 0 THEN
    RAISE EXCEPTION 'El importe debe ser mayor que 0';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_cash_session_movement
  BEFORE INSERT OR UPDATE ON public.cash_session_movements
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_cash_session_movement();

-- RLS
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_session_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_sessions_select" ON public.cash_sessions
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "cash_sessions_insert" ON public.cash_sessions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "cash_sessions_update" ON public.cash_sessions
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'administrador'));

CREATE POLICY "cash_session_movements_select" ON public.cash_session_movements
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "cash_session_movements_insert" ON public.cash_session_movements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'administrador'));
