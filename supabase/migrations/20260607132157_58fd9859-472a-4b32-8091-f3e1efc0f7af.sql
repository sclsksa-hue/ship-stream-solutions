
-- 1. PROFILES: restrict base table SELECT, expose safe fields via view
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Profiles: self, admins, and managers can view"
ON public.profiles FOR SELECT TO authenticated
USING (
  auth.uid() = id
  OR public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role_name(auth.uid(), 'super_admin')
  OR (public.has_role(auth.uid(), 'manager'::app_role) AND public.is_manager_of(auth.uid(), id))
);

-- Safe directory view: only non-sensitive identification fields
CREATE OR REPLACE VIEW public.profiles_directory
WITH (security_invoker = on) AS
SELECT id, full_name, avatar_url, department, position, is_active
FROM public.profiles;

GRANT SELECT ON public.profiles_directory TO authenticated;

-- 2. CUSTOMS DECLARATIONS: narrow SELECT to roles that need financial visibility
DROP POLICY IF EXISTS "All authenticated can view customs" ON public.customs_declarations;

CREATE POLICY "Role-scoped customs view"
ON public.customs_declarations FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role_name(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'operations'::app_role)
  OR public.has_role(auth.uid(), 'accountant'::app_role)
);

-- 3. STORAGE: remove legacy overly-permissive policies for shipment-documents
DROP POLICY IF EXISTS "Auth users can upload docs" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can delete own docs" ON storage.objects;
