DROP TRIGGER IF EXISTS trg_set_vehicle_reparacion ON public.expenses;
DROP TRIGGER IF EXISTS trg_expense_set_reparacion ON public.expenses;
DROP FUNCTION IF EXISTS public.set_vehicle_reparacion_on_expense() CASCADE;