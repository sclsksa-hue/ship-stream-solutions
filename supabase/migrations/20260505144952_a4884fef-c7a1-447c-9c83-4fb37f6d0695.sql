
-- 1) Audit trigger on profiles
DROP TRIGGER IF EXISTS audit_profiles ON public.profiles;
CREATE TRIGGER audit_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- 2) Enforce field-level permissions on profile UPDATE
CREATE OR REPLACE FUNCTION public.enforce_profile_field_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  is_admin boolean;
BEGIN
  -- Admins / super_admin bypass
  is_admin := public.has_role(uid, 'admin'::app_role) OR public.has_role_name(uid, 'super_admin');
  IF is_admin THEN
    RETURN NEW;
  END IF;

  -- Self-edit only beyond this point
  IF uid IS NULL OR uid <> NEW.id THEN
    RAISE EXCEPTION 'Not allowed to update this profile';
  END IF;

  -- Block protected fields when changed by non-admin self
  IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    RAISE EXCEPTION 'Only admins can change account status';
  END IF;
  IF NEW.manager_id IS DISTINCT FROM OLD.manager_id THEN
    RAISE EXCEPTION 'Only admins can assign a manager';
  END IF;
  IF NEW.department IS DISTINCT FROM OLD.department THEN
    RAISE EXCEPTION 'Only admins can change department';
  END IF;
  IF NEW.position IS DISTINCT FROM OLD.position THEN
    RAISE EXCEPTION 'Only admins can change position';
  END IF;
  IF NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Email change must go through Auth';
  END IF;
  IF NEW.customer_id IS DISTINCT FROM OLD.customer_id THEN
    RAISE EXCEPTION 'Only admins can link a customer';
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS enforce_profile_fields ON public.profiles;
CREATE TRIGGER enforce_profile_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_field_permissions();
