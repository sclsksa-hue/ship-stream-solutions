
-- New enum for shipment mode
CREATE TYPE public.shipment_mode AS ENUM ('fcl', 'lcl', 'air', 'land', 'multimodal');

-- New enum for activity type
CREATE TYPE public.activity_type AS ENUM ('call', 'meeting', 'email');

-- New enum for task status
CREATE TYPE public.task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Add missing columns to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS industry text;

-- Add missing columns to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes text;

-- Add missing columns to opportunities
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS trade_lane text;
ALTER TABLE public.opportunities ADD COLUMN IF NOT EXISTS mode shipment_mode;

-- Add missing columns to quotations
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS origin text;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS destination text;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS shipment_type shipment_mode;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS carrier_cost numeric;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS selling_price numeric;
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS margin numeric;

-- Create activities table
CREATE TABLE public.activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  notes text,
  assigned_to uuid,
  activity_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.opportunities(id) ON DELETE CASCADE,
  description text NOT NULL,
  due_date date,
  status task_status NOT NULL DEFAULT 'pending',
  assigned_to uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Updated_at triggers for new tables
CREATE TRIGGER update_activities_updated_at BEFORE UPDATE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS policies for activities
CREATE POLICY "Auth users can view activities" ON public.activities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create activities" ON public.activities FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update activities" ON public.activities FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete activities" ON public.activities FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies for tasks
CREATE POLICY "Auth users can view tasks" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update tasks" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete tasks" ON public.tasks FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
