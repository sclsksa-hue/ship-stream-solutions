
-- Helper: which customers can the current sales_agent see
CREATE OR REPLACE FUNCTION public.agent_can_see_customer(_customer_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.opportunities o WHERE o.customer_id = _customer_id AND o.assigned_to = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.quotations q WHERE q.customer_id = _customer_id AND q.created_by = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.client_requests cr WHERE cr.customer_id = _customer_id AND (cr.created_by = auth.uid() OR cr.assigned_to = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.customers c ON c.lead_id = l.id
    WHERE c.id = _customer_id AND (l.assigned_to = auth.uid() OR l.created_by = auth.uid())
  );
$$;

-- Replace permissive sales_agent customer SELECT with scoped one
DROP POLICY IF EXISTS "sales_agent view customers" ON public.customers;
CREATE POLICY "sales_agent view own customers" ON public.customers
FOR SELECT TO authenticated
USING (has_role_name(auth.uid(), 'sales_agent') AND public.agent_can_see_customer(id));

-- Same for contacts
DROP POLICY IF EXISTS "sales_agent view contacts" ON public.contacts;
CREATE POLICY "sales_agent view own contacts" ON public.contacts
FOR SELECT TO authenticated
USING (has_role_name(auth.uid(), 'sales_agent') AND public.agent_can_see_customer(customer_id));
