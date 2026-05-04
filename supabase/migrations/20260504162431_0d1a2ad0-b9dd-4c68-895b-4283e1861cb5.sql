
-- HELPERS
CREATE OR REPLACE FUNCTION public.is_manager_of(_manager UUID, _employee UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _employee AND manager_id = _manager);
$$;

CREATE OR REPLACE FUNCTION public.can_access_record(_assigned_to UUID, _created_by UUID DEFAULT NULL)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.has_role(auth.uid(), 'admin'::app_role)
    OR _assigned_to = auth.uid()
    OR _created_by = auth.uid()
    OR (public.has_role(auth.uid(), 'manager'::app_role) AND _assigned_to IS NOT NULL AND public.is_manager_of(auth.uid(), _assigned_to))
    OR (public.has_role(auth.uid(), 'manager'::app_role) AND _created_by IS NOT NULL AND public.is_manager_of(auth.uid(), _created_by));
$$;

REVOKE EXECUTE ON FUNCTION public.is_manager_of(UUID, UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.can_access_record(UUID, UUID) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_manager_of(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_record(UUID, UUID) TO authenticated;

-- AUDIT LOGS
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view audit logs" ON public.audit_logs;
CREATE POLICY "Admins view audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "System inserts audit logs" ON public.audit_logs;
CREATE POLICY "System inserts audit logs" ON public.audit_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values)
    VALUES (auth.uid(), 'delete', TG_TABLE_NAME, OLD.id, to_jsonb(OLD));
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
    VALUES (auth.uid(), 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, new_values)
    VALUES (auth.uid(), 'create', TG_TABLE_NAME, NEW.id, to_jsonb(NEW));
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_leads ON public.leads;
CREATE TRIGGER audit_leads AFTER INSERT OR UPDATE OR DELETE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_customers ON public.customers;
CREATE TRIGGER audit_customers AFTER INSERT OR UPDATE OR DELETE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_quotations ON public.quotations;
CREATE TRIGGER audit_quotations AFTER INSERT OR UPDATE OR DELETE ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_shipments ON public.shipments;
CREATE TRIGGER audit_shipments AFTER INSERT OR UPDATE OR DELETE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- ACTIVITY LOGS
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  page_visited TEXT,
  action TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_logs(created_at DESC);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins view activity logs" ON public.activity_logs;
CREATE POLICY "Admins view activity logs" ON public.activity_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users log own activity" ON public.activity_logs;
CREATE POLICY "Users log own activity" ON public.activity_logs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- HIERARCHICAL POLICIES
DROP POLICY IF EXISTS "Users can view relevant leads" ON public.leads;
CREATE POLICY "Hierarchical view leads" ON public.leads FOR SELECT TO authenticated
  USING (public.can_access_record(assigned_to, created_by));

DROP POLICY IF EXISTS "Users can view relevant opportunities" ON public.opportunities;
CREATE POLICY "Hierarchical view opportunities" ON public.opportunities FOR SELECT TO authenticated
  USING (public.can_access_record(assigned_to, NULL));

DROP POLICY IF EXISTS "Users can view relevant quotations" ON public.quotations;
CREATE POLICY "Hierarchical view quotations" ON public.quotations FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR created_by = auth.uid()
    OR (public.has_role(auth.uid(), 'manager'::app_role) AND created_by IS NOT NULL AND public.is_manager_of(auth.uid(), created_by))
  );

DROP POLICY IF EXISTS "Users can view relevant shipments" ON public.shipments;
CREATE POLICY "Hierarchical view shipments" ON public.shipments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'accountant'::app_role)
    OR public.has_role(auth.uid(), 'operations'::app_role)
    OR assigned_to = auth.uid()
    OR (public.has_role(auth.uid(), 'manager'::app_role) AND assigned_to IS NOT NULL AND public.is_manager_of(auth.uid(), assigned_to))
  );

DROP POLICY IF EXISTS "Users can view relevant tasks" ON public.tasks;
CREATE POLICY "Hierarchical view tasks" ON public.tasks FOR SELECT TO authenticated
  USING (public.can_access_record(assigned_to, NULL));

DROP POLICY IF EXISTS "Users can view relevant activities" ON public.activities;
CREATE POLICY "Hierarchical view activities" ON public.activities FOR SELECT TO authenticated
  USING (public.can_access_record(assigned_to, NULL));
