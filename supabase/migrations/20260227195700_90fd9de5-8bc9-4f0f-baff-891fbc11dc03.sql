
-- Allow authenticated users to READ finance config (needed for comparator)
-- Admin-only restriction is on INSERT/UPDATE/DELETE, not on reading

CREATE POLICY "Authenticated can select finance_entities"
  ON public.finance_entities FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can select finance_products"
  ON public.finance_products FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated can select finance_term_models"
  ON public.finance_term_models FOR SELECT TO authenticated
  USING (true);
