
-- 1. Restrict broad public SELECT to authenticated only
DROP POLICY IF EXISTS "All authenticated users can view customers" ON public.customers;
CREATE POLICY "Authenticated users can view customers" ON public.customers
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view contacts" ON public.contacts;
CREATE POLICY "Authenticated users can view contacts" ON public.contacts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view agents" ON public.agents;
CREATE POLICY "Authenticated users can view agents" ON public.agents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view tracking_events" ON public.tracking_events;
CREATE POLICY "Authenticated users can view tracking_events" ON public.tracking_events
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view documents" ON public.documents;
CREATE POLICY "Authenticated users can view documents" ON public.documents
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "All authenticated users can view containers" ON public.containers;
CREATE POLICY "Authenticated users can view containers" ON public.containers
  FOR SELECT TO authenticated USING (true);

-- 2. Tighten notifications INSERT (require authenticated; system inserts use service role which bypasses RLS)
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;
CREATE POLICY "Authenticated can create notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 3. Storage: remove public read on shipment-documents
DROP POLICY IF EXISTS "Anyone can view docs" ON storage.objects;

-- 4. Storage: add UPDATE policies for employee-docs (mirror INSERT)
CREATE POLICY "Employee docs: self update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-docs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'employee-docs' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Employee docs: admin update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'employee-docs' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role_name(auth.uid(),'super_admin')))
  WITH CHECK (bucket_id = 'employee-docs' AND (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role_name(auth.uid(),'super_admin')));

-- 5. Lock down SECURITY DEFINER function execution
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.prosecdef
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
  END LOOP;
END $$;

-- Grant EXECUTE to authenticated only for functions used in RLS policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role_name(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.agent_can_see_customer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_record(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_of(uuid, uuid) TO authenticated;

-- 6. Realtime: enable RLS deny-by-default on realtime.messages, allow users only on their own user-scoped topic
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can receive own topic" ON realtime.messages;
CREATE POLICY "Users can receive own topic" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    realtime.topic() = ('user:' || auth.uid()::text)
  );
