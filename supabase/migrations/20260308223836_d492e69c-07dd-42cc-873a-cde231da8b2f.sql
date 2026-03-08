
-- Add profit tracking columns to shipments
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS total_cost numeric DEFAULT 0;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS total_revenue numeric DEFAULT 0;
ALTER TABLE public.shipments ADD COLUMN IF NOT EXISTS profit numeric DEFAULT 0;

-- Task automation: auto-create task when lead status changes
CREATE OR REPLACE FUNCTION public.auto_task_on_lead_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    IF NEW.status = 'new' THEN
      INSERT INTO public.tasks (lead_id, description, assigned_to, status)
      VALUES (NEW.id, 'Follow up with new lead: ' || NEW.company_name, NEW.assigned_to, 'pending');
    ELSIF NEW.status = 'qualified' THEN
      INSERT INTO public.tasks (lead_id, description, assigned_to, status)
      VALUES (NEW.id, 'Prepare proposal for qualified lead: ' || NEW.company_name, NEW.assigned_to, 'pending');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_task_lead_status
AFTER UPDATE ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.auto_task_on_lead_status();

-- Task automation: auto-create task when quotation is accepted
CREATE OR REPLACE FUNCTION public.auto_task_on_quotation_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'accepted' THEN
    INSERT INTO public.tasks (customer_id, description, status)
    VALUES (NEW.customer_id, 'Create shipment for accepted quotation ' || NEW.quote_number, 'pending');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_task_quotation_accepted
AFTER UPDATE ON public.quotations
FOR EACH ROW EXECUTE FUNCTION public.auto_task_on_quotation_accepted();

-- Auto-create task for new leads on insert
CREATE OR REPLACE FUNCTION public.auto_task_on_lead_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.tasks (lead_id, description, assigned_to, status)
  VALUES (NEW.id, 'Follow up with new lead: ' || NEW.company_name, NEW.assigned_to, 'pending');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_task_lead_insert
AFTER INSERT ON public.leads
FOR EACH ROW EXECUTE FUNCTION public.auto_task_on_lead_insert();
