
-- 1. Deprecate columns
COMMENT ON COLUMN reservations.paid_at IS 'DEPRECATED - pagos gestionados en sales';
COMMENT ON COLUMN reservations.delivered_at IS 'DEPRECATED - entregas gestionadas en sales';
COMMENT ON COLUMN reservations.deposit_paid IS 'DEPRECATED - señal gestionada en sales';

-- 2. Migrate pagada/entregada to convertida
UPDATE public.reservations
SET reservation_status = 'convertida',
    converted_to_sale_at = COALESCE(converted_to_sale_at, now()),
    updated_at = now()
WHERE reservation_status IN ('pagada', 'entregada');

-- 3. Audit log for migrated reservations
INSERT INTO public.audit_logs (action, table_name, record_id, summary, actor_name, entity_type)
SELECT 'UPDATE', 'reservations', r.id,
  'Reserva migrada de estado ' || r.reservation_status || ' a convertida (refactor separación reservas/ventas)',
  'sistema', 'reservation'
FROM public.reservations r
WHERE r.reservation_status = 'convertida'
  AND r.converted_to_sale_at IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.audit_logs al
    WHERE al.record_id = r.id AND al.summary LIKE '%refactor separación%'
  );

-- 4. Block deprecated states trigger
CREATE OR REPLACE FUNCTION public.fn_block_deprecated_reservation_states()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.reservation_status IN ('pagada', 'entregada') THEN
    RAISE EXCEPTION 'Los estados "pagada" y "entregada" están deprecados en reservas. Usa el módulo de ventas.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_deprecated_reservation_states ON public.reservations;
CREATE TRIGGER trg_block_deprecated_reservation_states
  BEFORE INSERT OR UPDATE ON public.reservations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_block_deprecated_reservation_states();
