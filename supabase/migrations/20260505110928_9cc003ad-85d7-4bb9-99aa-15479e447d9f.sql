-- Enums
CREATE TYPE public.client_request_status AS ENUM ('new','assigned','in_progress','completed','cancelled');
CREATE TYPE public.client_request_priority AS ENUM ('normal','urgent','critical');

-- Table
CREATE TABLE public.client_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_number TEXT NOT NULL DEFAULT '',
  customer_id UUID NOT NULL,
  quotation_id UUID,
  service_type TEXT,
  details TEXT,
  origin TEXT,
  destination TEXT,
  required_date DATE,
  priority client_request_priority NOT NULL DEFAULT 'normal',
  status client_request_status NOT NULL DEFAULT 'new',
  assigned_to UUID,
  internal_notes TEXT,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-generate request number SCLS-REQ-YYYY-NNNN
CREATE OR REPLACE FUNCTION public.generate_request_number()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  yr TEXT := to_char(now(), 'YYYY');
  next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(request_number FROM 'SCLS-REQ-' || yr || '-(\d+)') AS INT)), 0) + 1
  INTO next_num FROM public.client_requests
  WHERE request_number LIKE 'SCLS-REQ-' || yr || '-%';
  NEW.request_number := 'SCLS-REQ-' || yr || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_request_number
BEFORE INSERT ON public.client_requests
FOR EACH ROW WHEN (NEW.request_number = '' OR NEW.request_number IS NULL)
EXECUTE FUNCTION public.generate_request_number();

CREATE TRIGGER trg_client_requests_updated_at
BEFORE UPDATE ON public.client_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Notify operations on new request, assigned user on assignment
CREATE OR REPLACE FUNCTION public.notify_client_request()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_role('operations','New Client Request',
      'Request ' || NEW.request_number || ' created (' || NEW.priority::text || ')',
      'request', CASE WHEN NEW.priority IN ('urgent','critical') THEN 'high' ELSE 'normal' END,
      'client_request', NEW.id);
  END IF;
  IF NEW.assigned_to IS NOT NULL AND (TG_OP='INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id,title,message,type,priority,reference_type,reference_id)
    VALUES (NEW.assigned_to, 'Request Assigned',
      'Request ' || NEW.request_number || ' assigned to you',
      'request', 'normal', 'client_request', NEW.id);
  END IF;
  IF TG_OP='UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.created_by IS NOT NULL THEN
    INSERT INTO public.notifications (user_id,title,message,type,priority,reference_type,reference_id)
    VALUES (NEW.created_by, 'Request Status Updated',
      'Request ' || NEW.request_number || ' is now ' || NEW.status::text,
      'request','normal','client_request',NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_client_request
AFTER INSERT OR UPDATE ON public.client_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_client_request();

-- Audit log trigger
CREATE TRIGGER trg_audit_client_requests
AFTER INSERT OR UPDATE OR DELETE ON public.client_requests
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

-- RLS
ALTER TABLE public.client_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hierarchical view client_requests"
ON public.client_requests FOR SELECT TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR has_role(auth.uid(),'operations')
  OR can_access_record(assigned_to, created_by)
);

CREATE POLICY "Sales and Admin can create client_requests"
ON public.client_requests FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'sales'));

CREATE POLICY "Sales Operations Admin can update client_requests"
ON public.client_requests FOR UPDATE TO authenticated
USING (
  has_role(auth.uid(),'admin')
  OR has_role(auth.uid(),'operations')
  OR (has_role(auth.uid(),'sales') AND created_by = auth.uid())
);

CREATE POLICY "Admins can delete client_requests"
ON public.client_requests FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'));

CREATE INDEX idx_client_requests_customer ON public.client_requests(customer_id);
CREATE INDEX idx_client_requests_status ON public.client_requests(status);
CREATE INDEX idx_client_requests_assigned ON public.client_requests(assigned_to);