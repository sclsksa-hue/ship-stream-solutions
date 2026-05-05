-- 1) Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_agent';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'marketing';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'finance';

-- 2) Text-based role checker (bypasses enum same-tx limitation)
CREATE OR REPLACE FUNCTION public.has_role_name(_uid uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role::text = _role);
$$;

REVOKE EXECUTE ON FUNCTION public.has_role_name(uuid,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role_name(uuid,text) TO authenticated;

-- 3) Invoicing fields on quotations (for finance role)
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS invoiced boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS invoiced_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoiced_by uuid;

-- 4) super_admin: full access on every business table
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'leads','customers','contacts','opportunities','quotations',
    'activities','tasks','shipments','customs_declarations','documents',
    'warehouses','warehouse_orders','containers','tracking_events',
    'agents','shipment_exceptions','client_requests','audit_logs',
    'activity_logs','user_roles','profiles','notifications','push_subscriptions'])
  LOOP
    EXECUTE format($f$DROP POLICY IF EXISTS "super_admin full access" ON public.%I$f$, t);
    EXECUTE format($f$
      CREATE POLICY "super_admin full access" ON public.%I
        AS PERMISSIVE FOR ALL TO authenticated
        USING (public.has_role_name(auth.uid(),'super_admin'))
        WITH CHECK (public.has_role_name(auth.uid(),'super_admin'))
    $f$, t);
  END LOOP;
END $$;

-- 5) sales_manager: full access on CRM tables
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'leads','customers','contacts','opportunities','quotations',
    'activities','tasks','client_requests'])
  LOOP
    EXECUTE format($f$DROP POLICY IF EXISTS "sales_manager crm access" ON public.%I$f$, t);
    EXECUTE format($f$
      CREATE POLICY "sales_manager crm access" ON public.%I
        AS PERMISSIVE FOR ALL TO authenticated
        USING (public.has_role_name(auth.uid(),'sales_manager'))
        WITH CHECK (public.has_role_name(auth.uid(),'sales_manager'))
    $f$, t);
  END LOOP;
END $$;

-- 6) sales_agent: only own records
DROP POLICY IF EXISTS "sales_agent own leads" ON public.leads;
CREATE POLICY "sales_agent own leads" ON public.leads FOR ALL TO authenticated
  USING (public.has_role_name(auth.uid(),'sales_agent') AND (assigned_to = auth.uid() OR created_by = auth.uid()))
  WITH CHECK (public.has_role_name(auth.uid(),'sales_agent') AND (assigned_to = auth.uid() OR created_by = auth.uid()));

DROP POLICY IF EXISTS "sales_agent own opportunities" ON public.opportunities;
CREATE POLICY "sales_agent own opportunities" ON public.opportunities FOR ALL TO authenticated
  USING (public.has_role_name(auth.uid(),'sales_agent') AND assigned_to = auth.uid())
  WITH CHECK (public.has_role_name(auth.uid(),'sales_agent') AND assigned_to = auth.uid());

DROP POLICY IF EXISTS "sales_agent own quotations" ON public.quotations;
CREATE POLICY "sales_agent own quotations" ON public.quotations FOR ALL TO authenticated
  USING (public.has_role_name(auth.uid(),'sales_agent') AND created_by = auth.uid())
  WITH CHECK (public.has_role_name(auth.uid(),'sales_agent') AND created_by = auth.uid());

DROP POLICY IF EXISTS "sales_agent own activities" ON public.activities;
CREATE POLICY "sales_agent own activities" ON public.activities FOR ALL TO authenticated
  USING (public.has_role_name(auth.uid(),'sales_agent') AND assigned_to = auth.uid())
  WITH CHECK (public.has_role_name(auth.uid(),'sales_agent') AND assigned_to = auth.uid());

DROP POLICY IF EXISTS "sales_agent own tasks" ON public.tasks;
CREATE POLICY "sales_agent own tasks" ON public.tasks FOR ALL TO authenticated
  USING (public.has_role_name(auth.uid(),'sales_agent') AND assigned_to = auth.uid())
  WITH CHECK (public.has_role_name(auth.uid(),'sales_agent') AND assigned_to = auth.uid());

DROP POLICY IF EXISTS "sales_agent own client_requests" ON public.client_requests;
CREATE POLICY "sales_agent own client_requests" ON public.client_requests FOR ALL TO authenticated
  USING (public.has_role_name(auth.uid(),'sales_agent') AND created_by = auth.uid())
  WITH CHECK (public.has_role_name(auth.uid(),'sales_agent') AND created_by = auth.uid());

-- sales_agent needs to see/create customers & contacts to operate
DROP POLICY IF EXISTS "sales_agent view customers" ON public.customers;
CREATE POLICY "sales_agent view customers" ON public.customers FOR SELECT TO authenticated
  USING (public.has_role_name(auth.uid(),'sales_agent'));
DROP POLICY IF EXISTS "sales_agent create customers" ON public.customers;
CREATE POLICY "sales_agent create customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (public.has_role_name(auth.uid(),'sales_agent'));

DROP POLICY IF EXISTS "sales_agent view contacts" ON public.contacts;
CREATE POLICY "sales_agent view contacts" ON public.contacts FOR SELECT TO authenticated
  USING (public.has_role_name(auth.uid(),'sales_agent'));
DROP POLICY IF EXISTS "sales_agent create contacts" ON public.contacts;
CREATE POLICY "sales_agent create contacts" ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (public.has_role_name(auth.uid(),'sales_agent'));

-- 7) marketing: read-only clients/leads/contacts (NO financial tables)
DROP POLICY IF EXISTS "marketing read customers" ON public.customers;
CREATE POLICY "marketing read customers" ON public.customers FOR SELECT TO authenticated
  USING (public.has_role_name(auth.uid(),'marketing'));

DROP POLICY IF EXISTS "marketing read leads" ON public.leads;
CREATE POLICY "marketing read leads" ON public.leads FOR SELECT TO authenticated
  USING (public.has_role_name(auth.uid(),'marketing'));

DROP POLICY IF EXISTS "marketing read contacts" ON public.contacts;
CREATE POLICY "marketing read contacts" ON public.contacts FOR SELECT TO authenticated
  USING (public.has_role_name(auth.uid(),'marketing'));

-- 8) finance: only accepted quotations; can mark as invoiced
DROP POLICY IF EXISTS "finance read accepted quotations" ON public.quotations;
CREATE POLICY "finance read accepted quotations" ON public.quotations FOR SELECT TO authenticated
  USING (public.has_role_name(auth.uid(),'finance') AND status::text = 'accepted');

DROP POLICY IF EXISTS "finance update accepted quotations" ON public.quotations;
CREATE POLICY "finance update accepted quotations" ON public.quotations FOR UPDATE TO authenticated
  USING (public.has_role_name(auth.uid(),'finance') AND status::text = 'accepted')
  WITH CHECK (public.has_role_name(auth.uid(),'finance') AND status::text = 'accepted');

-- 9) operations: tighten client_requests — only ASSIGNED requests visible/updatable
DROP POLICY IF EXISTS "Hierarchical view client_requests" ON public.client_requests;
CREATE POLICY "Hierarchical view client_requests" ON public.client_requests FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR public.has_role_name(auth.uid(),'super_admin')
    OR public.has_role_name(auth.uid(),'sales_manager')
    OR can_access_record(assigned_to, created_by)
    OR (has_role(auth.uid(),'operations'::app_role) AND assigned_to = auth.uid())
  );

DROP POLICY IF EXISTS "Sales Operations Admin can update client_requests" ON public.client_requests;
CREATE POLICY "operations update assigned client_requests" ON public.client_requests FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(),'admin'::app_role)
    OR public.has_role_name(auth.uid(),'super_admin')
    OR public.has_role_name(auth.uid(),'sales_manager')
    OR (has_role(auth.uid(),'sales'::app_role) AND created_by = auth.uid())
    OR (has_role(auth.uid(),'operations'::app_role) AND assigned_to = auth.uid())
  );