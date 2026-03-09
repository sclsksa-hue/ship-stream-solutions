
-- Customs declaration status enum
CREATE TYPE public.customs_status AS ENUM ('pending', 'submitted', 'under_review', 'approved', 'rejected', 'released');
CREATE TYPE public.customs_declaration_type AS ENUM ('import', 'export', 'transit');

-- Customs declarations table
CREATE TABLE public.customs_declarations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  declaration_number TEXT,
  declaration_type public.customs_declaration_type NOT NULL DEFAULT 'import',
  customs_broker TEXT,
  broker_contact TEXT,
  status public.customs_status NOT NULL DEFAULT 'pending',
  hs_code TEXT,
  declared_value NUMERIC DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'SAR',
  duties_amount NUMERIC DEFAULT 0,
  taxes_amount NUMERIC DEFAULT 0,
  regulatory_checks JSONB DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMP WITH TIME ZONE,
  cleared_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customs_declarations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view customs" ON public.customs_declarations
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operations and Admin can create customs" ON public.customs_declarations
FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)
);

CREATE POLICY "Operations and Admin can update customs" ON public.customs_declarations
FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)
);

CREATE POLICY "Admins can delete customs" ON public.customs_declarations
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_customs_declarations_updated_at
  BEFORE UPDATE ON public.customs_declarations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Warehouses table
CREATE TABLE public.warehouses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  city TEXT,
  country TEXT DEFAULT 'Saudi Arabia',
  capacity_cbm NUMERIC DEFAULT 0,
  used_cbm NUMERIC DEFAULT 0,
  warehouse_type TEXT DEFAULT 'general',
  contact_person TEXT,
  contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view warehouses" ON public.warehouses
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operations and Admin can create warehouses" ON public.warehouses
FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)
);

CREATE POLICY "Operations and Admin can update warehouses" ON public.warehouses
FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)
);

CREATE POLICY "Admins can delete warehouses" ON public.warehouses
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Warehouse order type enum
CREATE TYPE public.warehouse_order_type AS ENUM ('receive', 'put_away', 'pick', 'pack', 'dispatch');
CREATE TYPE public.warehouse_order_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');

-- Warehouse orders table
CREATE TABLE public.warehouse_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE SET NULL,
  order_type public.warehouse_order_type NOT NULL DEFAULT 'receive',
  status public.warehouse_order_status NOT NULL DEFAULT 'pending',
  reference_number TEXT,
  items JSONB DEFAULT '[]'::jsonb,
  total_packages INTEGER DEFAULT 0,
  total_weight_kg NUMERIC DEFAULT 0,
  total_cbm NUMERIC DEFAULT 0,
  scheduled_date DATE,
  completed_date TIMESTAMP WITH TIME ZONE,
  assigned_to UUID,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.warehouse_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated can view warehouse_orders" ON public.warehouse_orders
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operations and Admin can create warehouse_orders" ON public.warehouse_orders
FOR INSERT TO authenticated WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)
);

CREATE POLICY "Operations and Admin can update warehouse_orders" ON public.warehouse_orders
FOR UPDATE TO authenticated USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'operations'::app_role)
);

CREATE POLICY "Admins can delete warehouse_orders" ON public.warehouse_orders
FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_warehouse_orders_updated_at
  BEFORE UPDATE ON public.warehouse_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
