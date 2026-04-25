
CREATE OR REPLACE FUNCTION fn_match_vehicle_to_demands()
RETURNS TRIGGER AS $$
DECLARE
  d RECORD;
  v_score INT;
  v_level TEXT;
  v_year INT;
BEGIN
  IF NEW.status <> 'disponible' THEN
    RETURN NEW;
  END IF;

  v_year := EXTRACT(YEAR FROM NEW.first_registration);

  FOR d IN
    SELECT id, user_id, brand_preferences, fuel_types,
           price_min, price_max, transmission, year_min, km_max
    FROM demands
    WHERE status IN ('activa','en_seguimiento','en_negociacion')
  LOOP
    v_score := 0;

    IF array_length(d.brand_preferences, 1) > 0
       AND NEW.brand ILIKE ANY(
         SELECT '%' || unnest || '%' FROM unnest(d.brand_preferences)
       ) THEN
      v_score := v_score + 1;
    END IF;

    IF (d.price_max IS NOT NULL AND NEW.price_cash <= d.price_max) THEN
      v_score := v_score + 1;
    END IF;

    IF array_length(d.fuel_types, 1) > 0
       AND NEW.engine_type = ANY(d.fuel_types) THEN
      v_score := v_score + 1;
    END IF;

    IF d.transmission IS NOT NULL
       AND NEW.transmission = d.transmission THEN
      v_score := v_score + 1;
    END IF;

    IF d.year_min IS NOT NULL AND v_year >= d.year_min THEN
      v_score := v_score + 1;
    END IF;

    IF d.km_max IS NOT NULL AND NEW.km_entry <= d.km_max THEN
      v_score := v_score + 1;
    END IF;

    IF v_score >= 2 THEN
      IF v_score >= 3 THEN v_level := 'alta'; ELSE v_level := 'media'; END IF;

      INSERT INTO notifications (user_id, type, message, reference_id)
      VALUES (
        d.user_id,
        'demand_match',
        'Nuevo vehiculo ' || COALESCE(NEW.brand,'') || ' ' || COALESCE(NEW.model,'')
          || ' (' || COALESCE(NEW.plate,'') || ') coincide con tu demanda (coincidencia ' || v_level || ')',
        d.id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_vehicle_demand_match
  AFTER INSERT OR UPDATE OF status ON vehicles
  FOR EACH ROW
  EXECUTE FUNCTION fn_match_vehicle_to_demands();
