
-- Task assignment notification function
CREATE OR REPLACE FUNCTION public.notify_task_assignment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id, title, message, type, priority, reference_type, reference_id)
    VALUES (NEW.assigned_to, 'مهمة جديدة',
      'تم تعيين مهمة لك: ' || NEW.description,
      'task', 'normal', 'task', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Opportunity stage change notification
CREATE OR REPLACE FUNCTION public.notify_opportunity_stage()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, title, message, type, priority, reference_type, reference_id)
    VALUES (NEW.assigned_to, 'تغيّرت مرحلة الصفقة',
      'الصفقة "' || NEW.title || '" أصبحت في مرحلة ' || NEW.stage::text,
      'opportunity',
      CASE WHEN NEW.stage IN ('won','lost') THEN 'high' ELSE 'normal' END,
      'opportunity', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

-- Drop existing triggers (safe re-create)
DROP TRIGGER IF EXISTS trg_notify_task_assignment ON public.tasks;
DROP TRIGGER IF EXISTS trg_notify_task_overdue ON public.tasks;
DROP TRIGGER IF EXISTS trg_notify_quotation_status ON public.quotations;
DROP TRIGGER IF EXISTS trg_notify_lead_assignment ON public.leads;
DROP TRIGGER IF EXISTS trg_notify_opportunity_stage ON public.opportunities;
DROP TRIGGER IF EXISTS trg_notify_client_request ON public.client_requests;

CREATE TRIGGER trg_notify_task_assignment
  AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_assignment();

CREATE TRIGGER trg_notify_task_overdue
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.notify_task_overdue();

CREATE TRIGGER trg_notify_quotation_status
  AFTER UPDATE OF status ON public.quotations
  FOR EACH ROW EXECUTE FUNCTION public.notify_quotation_status();

CREATE TRIGGER trg_notify_lead_assignment
  AFTER INSERT OR UPDATE OF assigned_to ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_lead_assignment();

CREATE TRIGGER trg_notify_opportunity_stage
  AFTER UPDATE OF stage ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.notify_opportunity_stage();

CREATE TRIGGER trg_notify_client_request
  AFTER INSERT OR UPDATE ON public.client_requests
  FOR EACH ROW EXECUTE FUNCTION public.notify_client_request();

-- Enable realtime on notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
