
-- Enum types
CREATE TYPE public.vehicle_status AS ENUM ('disponible', 'reservado', 'reparacion', 'vendido', 'entregado', 'baja');
CREATE TYPE public.vehicle_class AS ENUM ('turismo', 'mixto', 'industrial');
CREATE TYPE public.vehicle_type AS ENUM ('nuevo', 'ocasion', 'usado');
CREATE TYPE public.engine_type AS ENUM ('gasolina', 'diesel', 'hibrido', 'electrico');
CREATE TYPE public.transmission_type AS ENUM ('manual', 'automatico');
CREATE TYPE public.tax_type AS ENUM ('igic', 'iva');
CREATE TYPE public.app_role AS ENUM ('vendedor', 'postventa', 'administrador');
CREATE TYPE public.validation_status AS ENUM ('pendiente', 'validado', 'rechazado');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- User roles (separate table per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'administrador'));

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  email TEXT,
  address TEXT,
  specialty TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers viewable by authenticated" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Suppliers manageable by authenticated" ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Suppliers updatable by authenticated" ON public.suppliers FOR UPDATE TO authenticated USING (true);

-- Insurers
CREATE TABLE public.insurers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  contact_person TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.insurers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Insurers viewable by authenticated" ON public.insurers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Insurers manageable by authenticated" ON public.insurers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Insurers updatable by authenticated" ON public.insurers FOR UPDATE TO authenticated USING (true);

-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL,
  vin TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  vehicle_class vehicle_class NOT NULL DEFAULT 'turismo',
  vehicle_type vehicle_type NOT NULL DEFAULT 'ocasion',
  engine_type engine_type NOT NULL DEFAULT 'gasolina',
  transmission transmission_type NOT NULL DEFAULT 'manual',
  displacement INTEGER NOT NULL DEFAULT 0,
  horsepower INTEGER NOT NULL DEFAULT 0,
  km_entry INTEGER NOT NULL DEFAULT 0,
  km_exit INTEGER,
  first_registration TIMESTAMPTZ NOT NULL DEFAULT now(),
  second_registration TIMESTAMPTZ,
  warranty_date TIMESTAMPTZ,
  itv_date TIMESTAMPTZ,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  sale_date TIMESTAMPTZ,
  delivery_date TIMESTAMPTZ,
  expo_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  has_second_key BOOLEAN NOT NULL DEFAULT false,
  has_technical_sheet BOOLEAN NOT NULL DEFAULT false,
  has_circulation_permit BOOLEAN NOT NULL DEFAULT false,
  has_manual BOOLEAN NOT NULL DEFAULT false,
  purchase_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_type tax_type NOT NULL DEFAULT 'igic',
  tax_rate NUMERIC(5,2) NOT NULL DEFAULT 7,
  irpf_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  discount NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_professionals NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_financed NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_cash NUMERIC(12,2) NOT NULL DEFAULT 0,
  pvp_base NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_expenses NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  net_profit NUMERIC(12,2) NOT NULL DEFAULT 0,
  status vehicle_status NOT NULL DEFAULT 'disponible',
  center TEXT NOT NULL DEFAULT 'Las Palmas',
  lot TEXT,
  insurer_id UUID REFERENCES public.insurers(id),
  policy_date TIMESTAMPTZ,
  policy_amount NUMERIC(12,2),
  buyer_id UUID,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Vehicles viewable by authenticated" ON public.vehicles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Vehicles insertable by authenticated" ON public.vehicles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Vehicles updatable by authenticated" ON public.vehicles FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Vehicles deletable by authenticated" ON public.vehicles FOR DELETE TO authenticated USING (true);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  completion_date TIMESTAMPTZ,
  supplier_id UUID REFERENCES public.suppliers(id),
  supplier_name TEXT,
  invoice_number TEXT NOT NULL DEFAULT '',
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  description TEXT NOT NULL DEFAULT '',
  observations TEXT NOT NULL DEFAULT '',
  courtesy_vehicle_plate TEXT,
  courtesy_delivery_date TIMESTAMPTZ,
  courtesy_return_date TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  updated_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Expenses viewable by authenticated" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Expenses insertable by authenticated" ON public.expenses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Expenses updatable by authenticated" ON public.expenses FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Expenses deletable by authenticated" ON public.expenses FOR DELETE TO authenticated USING (true);

-- Notes
CREATE TABLE public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  author_name TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notes viewable by authenticated" ON public.notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Notes insertable by authenticated" ON public.notes FOR INSERT TO authenticated WITH CHECK (true);

-- After-sale tickets
CREATE TABLE public.after_sale_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  request_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  requested_by UUID REFERENCES auth.users(id) NOT NULL,
  requested_by_name TEXT,
  task_description TEXT NOT NULL,
  validation_date TIMESTAMPTZ,
  validated_by UUID REFERENCES auth.users(id),
  validation_status validation_status NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.after_sale_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tickets viewable by authenticated" ON public.after_sale_tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tickets insertable by authenticated" ON public.after_sale_tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Tickets updatable by authenticated" ON public.after_sale_tickets FOR UPDATE TO authenticated USING (true);

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_after_sale_tickets_updated_at BEFORE UPDATE ON public.after_sale_tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  -- Default role: vendedor
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'vendedor');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
