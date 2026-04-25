
-- 1. Add new columns to reservations
ALTER TABLE public.reservations
  ADD COLUMN IF NOT EXISTS deposit_amount_source text NOT NULL DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS deposit_paid boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_payment_method text,
  ADD COLUMN IF NOT EXISTS reservation_number text,
  ADD COLUMN IF NOT EXISTS reservation_status text NOT NULL DEFAULT 'borrador',
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS converted_to_sale_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancellation_reason text,
  ADD COLUMN IF NOT EXISTS cancelled_by uuid,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS vehicle_pvp_snapshot numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS receipt_number text;

-- 2. Migrate existing statuses
UPDATE public.reservations SET reservation_status = 'reservada' WHERE status = 'activa';
UPDATE public.reservations SET reservation_status = 'convertida' WHERE status = 'convertida';
UPDATE public.reservations SET reservation_status = 'cancelada' WHERE status = 'cancelada';
UPDATE public.reservations SET reservation_status = 'vencida' WHERE status = 'expirada';

-- 3. Create reservation_clauses table
CREATE TABLE IF NOT EXISTS public.reservation_clauses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_key text UNIQUE NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.reservation_clauses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read clauses"
  ON public.reservation_clauses FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admins can manage clauses"
  ON public.reservation_clauses FOR ALL
  TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

-- 4. Seed default clauses
INSERT INTO public.reservation_clauses (clause_key, title, body, sort_order) VALUES
  ('imputacion_precio', 'Imputación al precio', 'La cantidad entregada en concepto de señal/arras, por importe de {{importe_senal}}, se imputará íntegramente al precio final del vehículo descrito en el presente documento.', 1),
  ('plazo_validez', 'Plazo de validez', 'La presente reserva tendrá una validez hasta el {{fecha_limite}}. Transcurrido dicho plazo sin que se haya formalizado la compraventa, la reserva quedará sin efecto salvo acuerdo expreso entre las partes.', 2),
  ('desistimiento_comprador', 'Desistimiento del comprador', 'En caso de desistimiento por parte del comprador, la cantidad entregada como señal quedará en poder del vendedor en concepto de indemnización por los daños y perjuicios causados, salvo acuerdo distinto entre las partes.', 3),
  ('incumplimiento_vendedor', 'Incumplimiento del vendedor', 'En caso de incumplimiento por parte del vendedor, éste deberá devolver al comprador el doble de la cantidad recibida como señal, salvo acuerdo distinto entre las partes.', 4),
  ('datos_vehiculo', 'Aceptación del estado', 'El comprador declara conocer el estado actual del vehículo y lo acepta en las condiciones descritas en el presente documento.', 5)
ON CONFLICT (clause_key) DO NOTHING;

-- 5. Function to assign reservation number
CREATE OR REPLACE FUNCTION public.fn_assign_reservation_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_year int;
  v_seq int;
BEGIN
  IF OLD.reservation_status IS DISTINCT FROM NEW.reservation_status
     AND NEW.reservation_status = 'pendiente_firma'
     AND NEW.reservation_number IS NULL THEN

    v_year := EXTRACT(YEAR FROM now());
    SELECT COALESCE(MAX(
      NULLIF(SPLIT_PART(reservation_number, '-', 3), '')::int
    ), 0) + 1
    INTO v_seq
    FROM public.reservations
    WHERE reservation_number LIKE 'RES-' || v_year || '-%';

    NEW.reservation_number := 'RES-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_assign_reservation_number
  BEFORE UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_assign_reservation_number();

-- 6. Validation trigger: no 0 deposit on pendiente_firma or reservada
CREATE OR REPLACE FUNCTION public.fn_validate_reservation_deposit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.reservation_status IN ('pendiente_firma', 'reservada') THEN
    IF COALESCE(NEW.reservation_amount, 0) <= 0 THEN
      RAISE EXCEPTION 'La señal debe ser superior a 0,00 € para formalizar la reserva';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_validate_reservation_deposit
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_reservation_deposit();
