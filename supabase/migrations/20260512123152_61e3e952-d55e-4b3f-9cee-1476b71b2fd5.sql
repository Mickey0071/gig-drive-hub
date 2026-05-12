
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('admin', 'driver', 'staff');
CREATE TYPE public.vehicle_status AS ENUM ('available', 'rented', 'maintenance', 'impound');
CREATE TYPE public.driver_status AS ENUM ('active', 'suspended', 'pending');
CREATE TYPE public.rideshare_platform AS ENUM ('uber', 'lyft', 'both');
CREATE TYPE public.rental_payment_status AS ENUM ('current', 'late', 'defaulted');
CREATE TYPE public.payment_method AS ENUM ('cash', 'zelle', 'card', 'stripe');
CREATE TYPE public.payment_status AS ENUM ('paid', 'late', 'missed');
CREATE TYPE public.inspection_type AS ENUM ('check-in', 'check-out');
CREATE TYPE public.violation_type AS ENUM ('PPA', 'ticket', 'impound');
CREATE TYPE public.violation_status AS ENUM ('pending', 'paid', 'contested');
CREATE TYPE public.staff_pay_type AS ENUM ('hourly', 'salary', 'per-vehicle');
CREATE TYPE public.staff_status AS ENUM ('active', 'inactive');
CREATE TYPE public.payroll_status AS ENUM ('draft', 'approved', 'paid');
CREATE TYPE public.line_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE public.expense_category AS ENUM ('payroll', 'maintenance', 'fuel', 'insurance', 'registration', 'impound', 'misc');
CREATE TYPE public.revenue_source AS ENUM ('rental', 'late_fee', 'deposit_kept', 'damage_charge');

-- ============ PROFILES & ROLES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT public.has_role(_user_id, 'admin'); $$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ VEHICLES ============
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  vin TEXT UNIQUE,
  plate TEXT NOT NULL,
  mileage INTEGER NOT NULL DEFAULT 0,
  status public.vehicle_status NOT NULL DEFAULT 'available',
  risk_tier TEXT,
  daily_rate NUMERIC(10,2),
  weekly_rate NUMERIC(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- ============ DRIVERS ============
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  license_number TEXT,
  license_expiry DATE,
  insurance_on_file BOOLEAN NOT NULL DEFAULT false,
  rideshare_platform public.rideshare_platform,
  status public.driver_status NOT NULL DEFAULT 'pending',
  date_added TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- ============ RENTALS ============
CREATE TABLE public.rentals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE RESTRICT,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  start_date DATE NOT NULL,
  end_date DATE,
  weekly_rate NUMERIC(10,2) NOT NULL,
  deposit_paid NUMERIC(10,2) NOT NULL DEFAULT 0,
  payment_status public.rental_payment_status NOT NULL DEFAULT 'current',
  return_condition TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.rentals ENABLE ROW LEVEL SECURITY;

-- ============ PAYMENTS ============
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_id UUID NOT NULL REFERENCES public.rentals(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE RESTRICT,
  amount NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  method public.payment_method,
  status public.payment_status NOT NULL DEFAULT 'late',
  stripe_payment_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ============ MAINTENANCE ============
CREATE TABLE public.maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  cost NUMERIC(10,2),
  vendor TEXT,
  date_completed DATE NOT NULL,
  mileage_at_service INTEGER,
  next_service_due DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.maintenance ENABLE ROW LEVEL SECURITY;

-- ============ INSPECTIONS ============
CREATE TABLE public.inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
  type public.inspection_type NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  mileage INTEGER,
  fuel_level TEXT,
  damage_noted BOOLEAN NOT NULL DEFAULT false,
  damage_photos TEXT[],
  completed_by UUID REFERENCES auth.users(id),
  notes TEXT
);
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;

-- ============ VIOLATIONS ============
CREATE TABLE public.violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
  type public.violation_type NOT NULL,
  amount NUMERIC(10,2),
  date_issued DATE NOT NULL,
  status public.violation_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.violations ENABLE ROW LEVEL SECURITY;

-- ============ STAFF (phase 2 use) ============
CREATE TABLE public.staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  role TEXT,
  phone TEXT,
  email TEXT,
  pay_type public.staff_pay_type,
  pay_rate NUMERIC(10,2),
  stripe_account_id TEXT,
  status public.staff_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  run_date TIMESTAMPTZ,
  total_payout NUMERIC(12,2) DEFAULT 0,
  status public.payroll_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payroll_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE RESTRICT,
  hours_worked NUMERIC(8,2),
  vehicles_handled INTEGER,
  gross_pay NUMERIC(10,2),
  deductions NUMERIC(10,2) DEFAULT 0,
  net_pay NUMERIC(10,2),
  stripe_transfer_id TEXT,
  status public.line_status NOT NULL DEFAULT 'pending'
);
ALTER TABLE public.payroll_line_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category public.expense_category NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  vendor TEXT,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  notes TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.revenue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source public.revenue_source NOT NULL,
  rental_id UUID REFERENCES public.rentals(id) ON DELETE SET NULL,
  amount NUMERIC(10,2) NOT NULL,
  date DATE NOT NULL,
  payment_method public.payment_method,
  stripe_payment_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.revenue_entries ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.pnl_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_revenue NUMERIC(12,2),
  total_expenses NUMERIC(12,2),
  payroll_total NUMERIC(12,2),
  net_profit NUMERIC(12,2),
  margin_pct NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pnl_snapshots ENABLE ROW LEVEL SECURITY;

-- ============ RLS POLICIES ============

-- profiles
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id OR public.is_admin(auth.uid()));
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "admins manage profiles" ON public.profiles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- user_roles
CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- vehicles: admins/staff full, drivers read only their assigned vehicle
CREATE POLICY "admins manage vehicles" ON public.vehicles FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "staff view vehicles" ON public.vehicles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "staff update vehicle status" ON public.vehicles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "drivers view own vehicle" ON public.vehicles FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rentals r JOIN public.drivers d ON d.id = r.driver_id
          WHERE r.vehicle_id = vehicles.id AND r.is_active AND d.user_id = auth.uid())
);

-- drivers
CREATE POLICY "admins manage drivers" ON public.drivers FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "staff view drivers" ON public.drivers FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "drivers view own record" ON public.drivers FOR SELECT TO authenticated USING (user_id = auth.uid());

-- rentals
CREATE POLICY "admins manage rentals" ON public.rentals FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "staff view rentals" ON public.rentals FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "drivers view own rentals" ON public.rentals FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = rentals.driver_id AND d.user_id = auth.uid())
);

-- payments
CREATE POLICY "admins manage payments" ON public.payments FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "staff manage payments" ON public.payments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "drivers view own payments" ON public.payments FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.drivers d WHERE d.id = payments.driver_id AND d.user_id = auth.uid())
);

-- maintenance
CREATE POLICY "admins manage maintenance" ON public.maintenance FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "staff manage maintenance" ON public.maintenance FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'staff'));

-- inspections
CREATE POLICY "admins manage inspections" ON public.inspections FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "staff manage inspections" ON public.inspections FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'staff')) WITH CHECK (public.has_role(auth.uid(), 'staff'));
CREATE POLICY "drivers view & create own inspections" ON public.inspections FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.rentals r JOIN public.drivers d ON d.id = r.driver_id WHERE r.id = inspections.rental_id AND d.user_id = auth.uid())
);
CREATE POLICY "drivers insert own inspections" ON public.inspections FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.rentals r JOIN public.drivers d ON d.id = r.driver_id WHERE r.id = rental_id AND d.user_id = auth.uid())
);

-- violations
CREATE POLICY "admins manage violations" ON public.violations FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "staff view violations" ON public.violations FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'staff'));

-- staff/payroll/expenses/revenue/pnl: admin only (phase 2 will widen)
CREATE POLICY "admins manage staff" ON public.staff FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "staff view own record" ON public.staff FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "admins manage payroll_runs" ON public.payroll_runs FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins manage payroll_line_items" ON public.payroll_line_items FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "staff view own line items" ON public.payroll_line_items FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.staff s WHERE s.id = payroll_line_items.staff_id AND s.user_id = auth.uid())
);
CREATE POLICY "admins manage expenses" ON public.expenses FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins manage revenue" ON public.revenue_entries FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY "admins manage pnl" ON public.pnl_snapshots FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- ============ STORAGE ============
INSERT INTO storage.buckets (id, name, public) VALUES ('inspections', 'inspections', true) ON CONFLICT DO NOTHING;
CREATE POLICY "inspection photos public read" ON storage.objects FOR SELECT USING (bucket_id = 'inspections');
CREATE POLICY "auth users upload inspections" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'inspections');
CREATE POLICY "admins manage inspection photos" ON storage.objects FOR ALL TO authenticated USING (bucket_id = 'inspections' AND public.is_admin(auth.uid()));
