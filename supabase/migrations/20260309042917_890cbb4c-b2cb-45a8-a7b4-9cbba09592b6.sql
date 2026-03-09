
-- Helper function to notify all users with a specific role
CREATE OR REPLACE FUNCTION public.notify_role(
  _role app_role,
  _title text,
  _message text,
  _type text DEFAULT 'info',
  _priority text DEFAULT 'normal',
  _reference_type text DEFAULT NULL,
  _reference_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, priority, reference_type, reference_id)
  SELECT ur.user_id, _title, _message, _type, _priority, _reference_type, _reference_id
  FROM public.user_roles ur
  WHERE ur.role = _role;
END;
$$;

-- Enhanced shipment notification: notify operations team on all shipment changes
CREATE OR REPLACE FUNCTION public.notify_shipment_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify assigned user
    IF NEW.assigned_to IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, priority, reference_type, reference_id)
      VALUES (
        NEW.assigned_to,
        'Shipment Status Updated',
        'Shipment ' || NEW.shipment_number || ' status changed to ' || REPLACE(NEW.status::text, '_', ' '),
        'shipment',
        CASE WHEN NEW.status IN ('delivered', 'customs', 'cancelled') THEN 'high' ELSE 'normal' END,
        'shipment',
        NEW.id
      );
    END IF;

    -- Notify all operations users for transit/port/customs changes
    IF NEW.status IN ('in_transit', 'at_port', 'customs') THEN
      PERFORM public.notify_role(
        'operations',
        'Shipment ' || REPLACE(NEW.status::text, '_', ' '),
        'Shipment ' || NEW.shipment_number || ' is now ' || REPLACE(NEW.status::text, '_', ' '),
        'shipment',
        CASE WHEN NEW.status = 'customs' THEN 'high' ELSE 'normal' END,
        'shipment',
        NEW.id
      );
    END IF;

    -- Notify sales team when shipment is delivered (for customer follow-up)
    IF NEW.status = 'delivered' THEN
      PERFORM public.notify_role(
        'sales',
        'Shipment Delivered',
        'Shipment ' || NEW.shipment_number || ' has been delivered. Follow up with customer.',
        'shipment',
        'normal',
        'shipment',
        NEW.id
      );
    END IF;

    -- Notify admins for critical status changes
    IF NEW.status IN ('customs', 'cancelled') THEN
      PERFORM public.notify_role(
        'admin',
        'Urgent: Shipment ' || REPLACE(NEW.status::text, '_', ' '),
        'Shipment ' || NEW.shipment_number || ' requires attention: ' || REPLACE(NEW.status::text, '_', ' '),
        'alert',
        'high',
        'shipment',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Enhanced lead notification: notify sales team on new leads
CREATE OR REPLACE FUNCTION public.notify_lead_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id, title, message, type, priority, reference_type, reference_id)
    VALUES (
      NEW.assigned_to,
      'New Lead Assigned',
      'Lead "' || NEW.company_name || '" has been assigned to you',
      'lead',
      'normal',
      'lead',
      NEW.id
    );
  END IF;

  -- Notify all sales users on new leads (not just assigned)
  IF TG_OP = 'INSERT' THEN
    PERFORM public.notify_role(
      'sales',
      'New Lead Added',
      'New lead: ' || NEW.company_name || ' (' || COALESCE(NEW.source, 'unknown source') || ')',
      'lead',
      'normal',
      'lead',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Enhanced quotation notification: notify sales on status changes
CREATE OR REPLACE FUNCTION public.notify_quotation_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Notify creator
    IF NEW.created_by IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, title, message, type, priority, reference_type, reference_id)
      VALUES (
        NEW.created_by,
        'Quotation Status Updated',
        'Quotation ' || NEW.quote_number || ' is now ' || NEW.status::text,
        'quotation',
        CASE WHEN NEW.status IN ('accepted', 'rejected') THEN 'high' ELSE 'normal' END,
        'quotation',
        NEW.id
      );
    END IF;

    -- Notify admins on accepted/rejected quotations
    IF NEW.status IN ('accepted', 'rejected') THEN
      PERFORM public.notify_role(
        'admin',
        'Quotation ' || NEW.status::text,
        'Quotation ' || NEW.quote_number || ' has been ' || NEW.status::text,
        'quotation',
        'high',
        'quotation',
        NEW.id
      );
    END IF;

    -- Notify operations when quotation is accepted (to prepare shipment)
    IF NEW.status = 'accepted' THEN
      PERFORM public.notify_role(
        'operations',
        'New Quotation Accepted',
        'Quotation ' || NEW.quote_number || ' accepted. Prepare for shipment booking.',
        'quotation',
        'high',
        'quotation',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Notify operations on customs declaration changes
CREATE OR REPLACE FUNCTION public.notify_customs_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.notify_role(
      'operations',
      CASE WHEN TG_OP = 'INSERT' THEN 'New Customs Declaration' ELSE 'Customs Status Updated' END,
      'Declaration ' || COALESCE(NEW.declaration_number, 'N/A') || ' is ' || REPLACE(NEW.status::text, '_', ' '),
      'customs',
      CASE WHEN NEW.status IN ('rejected', 'under_review') THEN 'high' ELSE 'normal' END,
      'customs',
      NEW.id
    );

    IF NEW.status = 'rejected' THEN
      PERFORM public.notify_role(
        'admin',
        'Customs Declaration Rejected',
        'Declaration ' || COALESCE(NEW.declaration_number, 'N/A') || ' has been rejected',
        'alert',
        'high',
        'customs',
        NEW.id
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create customs trigger
DROP TRIGGER IF EXISTS on_customs_status_change ON public.customs_declarations;
CREATE TRIGGER on_customs_status_change
  AFTER INSERT OR UPDATE ON public.customs_declarations
  FOR EACH ROW EXECUTE FUNCTION public.notify_customs_status_change();
