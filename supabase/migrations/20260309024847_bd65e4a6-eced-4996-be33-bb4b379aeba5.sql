-- Shipment exceptions/incidents table
CREATE TABLE public.shipment_exceptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  exception_type TEXT NOT NULL DEFAULT 'delay',
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  description TEXT,
  reported_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shipment_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view exceptions" ON public.shipment_exceptions
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operations and Admin can create exceptions" ON public.shipment_exceptions
FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role) OR has_role(auth.uid(), 'sales'::app_role)
);

CREATE POLICY "Operations and Admin can update exceptions" ON public.shipment_exceptions
FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)
);

CREATE POLICY "Admins can delete exceptions" ON public.shipment_exceptions
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Add updated_at trigger
CREATE TRIGGER update_shipment_exceptions_updated_at
  BEFORE UPDATE ON public.shipment_exceptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();