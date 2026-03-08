
-- Shipment status enum
CREATE TYPE public.shipment_status AS ENUM ('booked', 'in_transit', 'at_port', 'customs', 'delivered', 'cancelled');

-- Container type enum
CREATE TYPE public.container_type AS ENUM ('20ft', '40ft', '40hc', '45ft', 'reefer_20', 'reefer_40');

-- Document type enum
CREATE TYPE public.document_type AS ENUM ('bill_of_lading', 'invoice', 'packing_list', 'customs_declaration', 'certificate_of_origin', 'other');

-- Tracking milestone enum
CREATE TYPE public.tracking_milestone AS ENUM ('booking_confirmed', 'cargo_received', 'loaded_on_vessel', 'departed_origin', 'in_transit', 'arrived_destination', 'customs_clearance', 'out_for_delivery', 'delivered');

-- Agents table
CREATE TABLE public.agents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_name TEXT NOT NULL,
  country TEXT,
  city TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  agent_type TEXT DEFAULT 'overseas_agent',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view agents" ON public.agents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create agents" ON public.agents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update agents" ON public.agents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete agents" ON public.agents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Shipments table
CREATE TABLE public.shipments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_number TEXT NOT NULL DEFAULT '',
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  opportunity_id UUID REFERENCES public.opportunities(id),
  quotation_id UUID REFERENCES public.quotations(id),
  agent_id UUID REFERENCES public.agents(id),
  mode public.shipment_mode NOT NULL DEFAULT 'fcl',
  origin TEXT,
  destination TEXT,
  carrier TEXT,
  etd DATE,
  eta DATE,
  status public.shipment_status NOT NULL DEFAULT 'booked',
  assigned_to UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view shipments" ON public.shipments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create shipments" ON public.shipments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update shipments" ON public.shipments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete shipments" ON public.shipments FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-generate shipment number
CREATE OR REPLACE FUNCTION public.generate_shipment_number()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE next_num INT;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(shipment_number FROM 'SHP-(\d+)') AS INT)), 0) + 1
  INTO next_num FROM public.shipments;
  NEW.shipment_number := 'SHP-' || LPAD(next_num::TEXT, 5, '0');
  RETURN NEW;
END;
$$;
CREATE TRIGGER set_shipment_number BEFORE INSERT ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.generate_shipment_number();

-- Updated_at triggers
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON public.agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Containers table
CREATE TABLE public.containers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  container_number TEXT,
  container_type public.container_type NOT NULL DEFAULT '20ft',
  weight_kg NUMERIC,
  cbm NUMERIC,
  packages INT,
  commodity TEXT,
  seal_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view containers" ON public.containers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create containers" ON public.containers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update containers" ON public.containers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete containers" ON public.containers FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Tracking events table
CREATE TABLE public.tracking_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  milestone public.tracking_milestone NOT NULL,
  event_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view tracking_events" ON public.tracking_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create tracking_events" ON public.tracking_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update tracking_events" ON public.tracking_events FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete tracking_events" ON public.tracking_events FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  document_type public.document_type NOT NULL DEFAULT 'other',
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INT,
  uploaded_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth users can view documents" ON public.documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can create documents" ON public.documents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users can update documents" ON public.documents FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete documents" ON public.documents FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for shipment documents
INSERT INTO storage.buckets (id, name, public) VALUES ('shipment-documents', 'shipment-documents', true);
CREATE POLICY "Auth users can upload docs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'shipment-documents');
CREATE POLICY "Anyone can view docs" ON storage.objects FOR SELECT USING (bucket_id = 'shipment-documents');
CREATE POLICY "Auth users can delete own docs" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'shipment-documents');

-- Enable realtime for shipments tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_events;
