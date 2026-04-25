
-- Add 'contabilidad' to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'contabilidad';

-- Update handle_new_user to accept 'contabilidad' role from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role app_role;
  v_meta_role text;
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  v_meta_role := NEW.raw_user_meta_data->>'role';
  IF v_meta_role IS NOT NULL AND v_meta_role IN ('vendedor', 'postventa', 'administrador', 'contabilidad') THEN
    v_role := v_meta_role::app_role;
  ELSE
    v_role := 'vendedor'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$function$;
