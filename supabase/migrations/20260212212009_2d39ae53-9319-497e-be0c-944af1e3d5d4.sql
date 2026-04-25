
-- =============================================
-- FASE D: Reservas Profesionales
-- =============================================

-- 1. Tabla reservations
CREATE TABLE public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id),
  buyer_id uuid NOT NULL REFERENCES public.buyers(id),
  reservation_date timestamptz NOT NULL DEFAULT now(),
  expiration_date timestamptz NOT NULL,
  reservation_amount numeric NOT NULL DEFAULT 0,
  payment_method text,
  status text NOT NULL DEFAULT 'activa',
  converted_sale_id uuid,
  applied_to_invoice boolean NOT NULL DEFAULT false,
  notes text,
  reminder_24h_sent boolean NOT NULL DEFAULT false,
  reminder_24h_sent_at timestamptz,
  reminder_same_day_sent boolean NOT NULL DEFAULT false,
  reminder_same_day_sent_at timestamptz,
  contract_template_id text,
  contract_pdf_url text,
  contract_generated_at timestamptz,
  contract_signed boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indice unico parcial: maximo 1 reserva activa por vehiculo
CREATE UNIQUE INDEX idx_one_active_reservation ON public.reservations (vehicle_id) WHERE status = 'activa';

-- Trigger updated_at
CREATE TRIGGER update_reservations_updated_at
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger auditoria
CREATE TRIGGER audit_reservations
  AFTER INSERT OR UPDATE OR DELETE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

-- RLS
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reservations viewable by authenticated"
  ON public.reservations FOR SELECT
  USING (true);

CREATE POLICY "Reservations insertable by authenticated"
  ON public.reservations FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Reservations updatable by authenticated"
  ON public.reservations FOR UPDATE
  USING (true);

CREATE POLICY "Reservations deletable by admins"
  ON public.reservations FOR DELETE
  USING (has_role(auth.uid(), 'administrador'::app_role));

-- 2. Tabla notifications (por usuario)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  reference_id uuid,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications viewable by own user"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Notifications insertable by authenticated"
  ON public.notifications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Notifications updatable by own user"
  ON public.notifications FOR UPDATE
  USING (user_id = auth.uid());

-- 3. Trigger: al crear reserva activa, poner vehiculo en 'reservado'
CREATE OR REPLACE FUNCTION public.fn_reservation_set_vehicle_reserved()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'activa' THEN
    UPDATE public.vehicles
    SET status = 'reservado', updated_at = now()
    WHERE id = NEW.vehicle_id
      AND status IN ('disponible', 'reparacion');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_reservation_set_vehicle_reserved
  AFTER INSERT ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_reservation_set_vehicle_reserved();
