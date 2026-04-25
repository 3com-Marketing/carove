
-- 1.1 Update handle_new_user to respect role from metadata
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
  -- Insert profile
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));

  -- Check if a valid role was provided in metadata (e.g. from admin invitation)
  v_meta_role := NEW.raw_user_meta_data->>'role';
  IF v_meta_role IS NOT NULL AND v_meta_role IN ('vendedor', 'postventa', 'administrador') THEN
    v_role := v_meta_role::app_role;
  ELSE
    v_role := 'vendedor'::app_role;
  END IF;

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, v_role);
  RETURN NEW;
END;
$function$;

-- 1.2 Create fn_prevent_last_admin_removal
CREATE OR REPLACE FUNCTION public.fn_prevent_last_admin_removal()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_count integer;
BEGIN
  -- On DELETE: block if deleting an admin and it's the last one
  IF TG_OP = 'DELETE' AND OLD.role = 'administrador' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.user_roles
    WHERE role = 'administrador' AND user_id != OLD.user_id;

    IF v_admin_count = 0 THEN
      RAISE EXCEPTION 'No se puede eliminar el último administrador del sistema';
    END IF;
    RETURN OLD;
  END IF;

  -- On UPDATE: block if changing from admin to non-admin and it's the last one
  IF TG_OP = 'UPDATE' AND OLD.role = 'administrador' AND NEW.role != 'administrador' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.user_roles
    WHERE role = 'administrador' AND user_id != OLD.user_id;

    IF v_admin_count = 0 THEN
      RAISE EXCEPTION 'No se puede quitar el rol de administrador al último administrador del sistema';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- Attach trigger to user_roles
CREATE TRIGGER trg_prevent_last_admin_removal
  BEFORE UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_prevent_last_admin_removal();

-- 1.3 Audit trigger on user_roles
CREATE TRIGGER audit_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_trigger_func();

-- 1.4 Allow admins to update profiles.active for other users
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  USING (has_role(auth.uid(), 'administrador'::app_role));
