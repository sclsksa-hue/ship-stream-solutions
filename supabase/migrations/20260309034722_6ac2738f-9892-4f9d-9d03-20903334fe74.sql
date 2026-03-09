
-- Add customer category enum and column
CREATE TYPE public.customer_category AS ENUM ('vip', 'regular', 'lead');
ALTER TABLE public.customers ADD COLUMN category public.customer_category NOT NULL DEFAULT 'regular';

-- Update RLS policies for data visibility:
-- Admin sees all, others see only their assigned/created data

-- LEADS: admin sees all, others see only assigned to them
DROP POLICY IF EXISTS "All authenticated users can view leads" ON public.leads;
CREATE POLICY "Users can view relevant leads" ON public.leads
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_to = auth.uid()
  OR created_by = auth.uid()
);

-- OPPORTUNITIES: admin sees all, sales sees own
DROP POLICY IF EXISTS "All authenticated users can view opportunities" ON public.opportunities;
CREATE POLICY "Users can view relevant opportunities" ON public.opportunities
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_to = auth.uid()
);

-- TASKS: admin sees all, others see own
DROP POLICY IF EXISTS "All authenticated users can view tasks" ON public.tasks;
CREATE POLICY "Users can view relevant tasks" ON public.tasks
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_to = auth.uid()
);

-- ACTIVITIES: admin sees all, others see own
DROP POLICY IF EXISTS "All authenticated users can view activities" ON public.activities;
CREATE POLICY "Users can view relevant activities" ON public.activities
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_to = auth.uid()
);

-- SHIPMENTS: admin sees all, operations sees own
DROP POLICY IF EXISTS "All authenticated users can view shipments" ON public.shipments;
CREATE POLICY "Users can view relevant shipments" ON public.shipments
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR assigned_to = auth.uid()
);

-- QUOTATIONS: admin sees all, sales sees own
DROP POLICY IF EXISTS "All authenticated users can view quotations" ON public.quotations;
CREATE POLICY "Users can view relevant quotations" ON public.quotations
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR created_by = auth.uid()
);
