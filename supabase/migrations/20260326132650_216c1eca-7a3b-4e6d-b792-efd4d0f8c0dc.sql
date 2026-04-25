
CREATE TABLE public.vehicle_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES public.vehicles(id) NOT NULL,
  seller_id uuid REFERENCES public.buyers(id) NOT NULL,
  appraisal_id uuid DEFAULT NULL,
  source_type text NOT NULL DEFAULT 'particular',
  status text NOT NULL DEFAULT 'nuevo',
  requested_price numeric DEFAULT 0,
  appraised_market_value numeric DEFAULT NULL,
  suggested_offer_price numeric DEFAULT NULL,
  offered_price numeric DEFAULT NULL,
  agreed_price numeric DEFAULT NULL,
  purchase_date date DEFAULT NULL,
  payment_method text DEFAULT 'pendiente_definir',
  payment_status text DEFAULT 'pendiente',
  purchase_invoice_number text DEFAULT NULL,
  purchase_invoice_date date DEFAULT NULL,
  notes text DEFAULT NULL,
  internal_notes text DEFAULT NULL,
  created_by uuid NOT NULL,
  updated_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE vehicle_purchases ADD CONSTRAINT vp_source_type_check
  CHECK (source_type IN ('particular','profesional','trade_in','subasta','recompra','otro'));
ALTER TABLE vehicle_purchases ADD CONSTRAINT vp_status_check
  CHECK (status IN ('nuevo','en_tasacion','tasado','oferta_realizada','negociacion','acordado','comprado','cancelado','rechazado'));
ALTER TABLE vehicle_purchases ADD CONSTRAINT vp_payment_method_check
  CHECK (payment_method IN ('transferencia','efectivo','cheque','pendiente_definir'));
ALTER TABLE vehicle_purchases ADD CONSTRAINT vp_payment_status_check
  CHECK (payment_status IN ('pendiente','parcial','pagado'));

CREATE TRIGGER trg_vp_updated_at BEFORE UPDATE ON vehicle_purchases
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vehicle_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "authenticated full access" ON vehicle_purchases
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION fn_validate_purchase_status_transition()
  RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  IF OLD.status = NEW.status THEN RETURN NEW; END IF;
  IF OLD.status = 'nuevo' AND NEW.status NOT IN ('en_tasacion','oferta_realizada','cancelado') THEN
    RAISE EXCEPTION 'Transición no permitida: % → %', OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'en_tasacion' AND NEW.status NOT IN ('tasado','cancelado') THEN
    RAISE EXCEPTION 'Transición no permitida: % → %', OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'tasado' AND NEW.status NOT IN ('oferta_realizada','cancelado','rechazado') THEN
    RAISE EXCEPTION 'Transición no permitida: % → %', OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'oferta_realizada' AND NEW.status NOT IN ('negociacion','acordado','cancelado','rechazado') THEN
    RAISE EXCEPTION 'Transición no permitida: % → %', OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'negociacion' AND NEW.status NOT IN ('acordado','cancelado','rechazado') THEN
    RAISE EXCEPTION 'Transición no permitida: % → %', OLD.status, NEW.status;
  END IF;
  IF OLD.status = 'acordado' AND NEW.status NOT IN ('comprado','cancelado') THEN
    RAISE EXCEPTION 'Transición no permitida: % → %', OLD.status, NEW.status;
  END IF;
  IF OLD.status IN ('comprado','cancelado','rechazado') THEN
    RAISE EXCEPTION 'No se puede cambiar el estado de una operación finalizada';
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_vp_status_transition BEFORE UPDATE ON vehicle_purchases
  FOR EACH ROW EXECUTE FUNCTION fn_validate_purchase_status_transition();

CREATE OR REPLACE FUNCTION fn_purchase_sync_to_vehicle()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.status = 'comprado' AND OLD.status != 'comprado' THEN
    UPDATE public.vehicles SET
      purchase_price = COALESCE(NEW.agreed_price, 0),
      purchase_date = COALESCE(NEW.purchase_date::timestamptz, now()),
      owner_client_id = NEW.seller_id,
      created_from = NEW.source_type,
      updated_at = now()
    WHERE id = NEW.vehicle_id;
    UPDATE public.buyers SET is_seller = true WHERE id = NEW.seller_id AND is_seller = false;
  END IF;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_vp_sync_vehicle AFTER UPDATE ON vehicle_purchases
  FOR EACH ROW EXECUTE FUNCTION fn_purchase_sync_to_vehicle();

CREATE OR REPLACE FUNCTION fn_purchase_mark_seller()
  RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.buyers SET is_seller = true WHERE id = NEW.seller_id AND is_seller = false;
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_vp_mark_seller AFTER INSERT ON vehicle_purchases
  FOR EACH ROW EXECUTE FUNCTION fn_purchase_mark_seller();
