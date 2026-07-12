-- Create custom enums
CREATE TYPE user_role AS ENUM ('fleet_manager', 'driver', 'safety_officer', 'financial_analyst');
CREATE TYPE vehicle_status AS ENUM ('Available', 'On Trip', 'In Shop', 'Retired');
CREATE TYPE driver_status AS ENUM ('Available', 'On Trip', 'Off Duty', 'Suspended');
CREATE TYPE trip_status AS ENUM ('Draft', 'Dispatched', 'Completed', 'Cancelled');
CREATE TYPE maintenance_status AS ENUM ('Active', 'Closed');

-- Users profiles table (public.users)
CREATE TABLE public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'fleet_manager',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on public.users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Helper function to get role of authenticated user
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS user_role AS $$
DECLARE
    r user_role;
BEGIN
    SELECT role INTO r FROM public.users WHERE id = auth.uid();
    RETURN r;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger function to sync auth.users with public.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    new.id,
    new.email,
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'fleet_manager'::user_role)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function when a new auth.user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Vehicle registry table
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- e.g. Truck, Van, Sedan
    status vehicle_status NOT NULL DEFAULT 'Available',
    region TEXT NOT NULL,
    odometer NUMERIC NOT NULL DEFAULT 0,
    max_load_capacity NUMERIC NOT NULL, -- in kg
    acquisition_cost NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- Driver profile table
CREATE TABLE public.drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    license_number TEXT NOT NULL UNIQUE,
    license_category TEXT NOT NULL,
    license_expiry DATE NOT NULL,
    contact_number TEXT NOT NULL,
    safety_score NUMERIC NOT NULL DEFAULT 100 CHECK (safety_score >= 0 AND safety_score <= 100),
    status driver_status NOT NULL DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;

-- Trip lifecycle table
CREATE TABLE public.trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source TEXT NOT NULL,
    destination TEXT NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL,
    cargo_weight NUMERIC NOT NULL CHECK (cargo_weight > 0),
    distance NUMERIC, -- in km, updated when completed
    fuel_consumed NUMERIC, -- in liters, updated when completed
    status trip_status NOT NULL DEFAULT 'Draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- Trigger to check trip cargo weight against vehicle's max capacity
CREATE OR REPLACE FUNCTION public.check_trip_cargo_weight()
RETURNS trigger AS $$
DECLARE
    v_max_load NUMERIC;
BEGIN
    IF NEW.vehicle_id IS NOT NULL THEN
        SELECT max_load_capacity INTO v_max_load FROM public.vehicles WHERE id = NEW.vehicle_id;
        IF NEW.cargo_weight > v_max_load THEN
            RAISE EXCEPTION 'Cargo weight (%) exceeds vehicle max load capacity (%)', NEW.cargo_weight, v_max_load;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER before_trip_insert_update
  BEFORE INSERT OR UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.check_trip_cargo_weight();

-- Trigger to handle vehicle/driver status changes based on trip transitions
CREATE OR REPLACE FUNCTION public.handle_trip_status_change()
RETURNS trigger AS $$
BEGIN
    -- Transition to Dispatched (Draft -> Dispatched or direct to Dispatched)
    IF NEW.status = 'Dispatched' AND (TG_OP = 'INSERT' OR OLD.status = 'Draft') THEN
        UPDATE public.vehicles SET status = 'On Trip' WHERE id = NEW.vehicle_id;
        UPDATE public.drivers SET status = 'On Trip' WHERE id = NEW.driver_id;
    END IF;

    -- Transition to Completed (Dispatched -> Completed)
    IF NEW.status = 'Completed' AND (TG_OP = 'UPDATE' AND OLD.status = 'Dispatched') THEN
        UPDATE public.vehicles SET status = 'Available' WHERE id = NEW.vehicle_id;
        UPDATE public.drivers SET status = 'Available' WHERE id = NEW.driver_id;
    END IF;

    -- Transition to Cancelled (Dispatched -> Cancelled)
    IF NEW.status = 'Cancelled' AND (TG_OP = 'UPDATE' AND OLD.status = 'Dispatched') THEN
        UPDATE public.vehicles SET status = 'Available' WHERE id = NEW.vehicle_id;
        UPDATE public.drivers SET status = 'Available' WHERE id = NEW.driver_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_trip_status_change
  AFTER INSERT OR UPDATE OF status ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_status_change();

-- Maintenance logs table
CREATE TABLE public.maintenance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    description TEXT NOT NULL,
    cost NUMERIC NOT NULL CHECK (cost >= 0),
    status maintenance_status NOT NULL DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Trigger to set vehicle to 'In Shop' on active maintenance log and 'Available' when closed
CREATE OR REPLACE FUNCTION public.handle_maintenance_change()
RETURNS trigger AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.vehicles SET status = 'In Shop' WHERE id = NEW.vehicle_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF NEW.status = 'Closed' AND OLD.status = 'Active' THEN
            UPDATE public.vehicles 
            SET status = CASE WHEN status = 'Retired' THEN 'Retired'::vehicle_status ELSE 'Available'::vehicle_status END
            WHERE id = NEW.vehicle_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_maintenance_change
  AFTER INSERT OR UPDATE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_maintenance_change();

-- Fuel logs table
CREATE TABLE public.fuel_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    liters NUMERIC NOT NULL CHECK (liters > 0),
    cost NUMERIC NOT NULL CHECK (cost >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;

-- Expenses table
CREATE TABLE public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL, -- e.g. Insurance, Permit, Toll, Other
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- ========================================================
-- ROW LEVEL SECURITY POLICIES
-- ========================================================

-- Users Policies
CREATE POLICY "Allow read access to authenticated users" ON public.users
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow fleet manager to update any profile" ON public.users
    FOR UPDATE TO authenticated USING (public.get_my_role() = 'fleet_manager');

CREATE POLICY "Allow users to update their own profile" ON public.users
    FOR UPDATE TO authenticated USING (id = auth.uid());

-- Vehicles Policies
CREATE POLICY "Allow read access to authenticated users" ON public.vehicles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow fleet manager full write access" ON public.vehicles
    FOR ALL TO authenticated USING (public.get_my_role() = 'fleet_manager');

-- Drivers Policies
CREATE POLICY "Allow read access to authenticated users" ON public.drivers
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow fleet manager full write access" ON public.drivers
    FOR ALL TO authenticated USING (public.get_my_role() = 'fleet_manager');

CREATE POLICY "Allow safety officer full write access" ON public.drivers
    FOR ALL TO authenticated USING (public.get_my_role() = 'safety_officer');

-- Trips Policies
CREATE POLICY "Allow read access to authenticated users" ON public.trips
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow fleet manager full write access" ON public.trips
    FOR ALL TO authenticated USING (public.get_my_role() = 'fleet_manager');

CREATE POLICY "Allow drivers to update their own assigned trips" ON public.trips
    FOR ALL TO authenticated USING (
        driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    );

-- Maintenance Logs Policies
CREATE POLICY "Allow read access to authenticated users" ON public.maintenance_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow fleet manager full write access" ON public.maintenance_logs
    FOR ALL TO authenticated USING (public.get_my_role() = 'fleet_manager');

-- Fuel Logs Policies
CREATE POLICY "Allow read access to authenticated users" ON public.fuel_logs
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow fleet manager full write access" ON public.fuel_logs
    FOR ALL TO authenticated USING (public.get_my_role() = 'fleet_manager');

CREATE POLICY "Allow driver to log fuel" ON public.fuel_logs
    FOR INSERT TO authenticated WITH CHECK (
        public.get_my_role() = 'driver'
    );

-- Expenses Policies
CREATE POLICY "Allow read access to authenticated users" ON public.expenses
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow fleet manager full write access" ON public.expenses
    FOR ALL TO authenticated USING (public.get_my_role() = 'fleet_manager');
