-- ============================================================
-- TransitOps — Supabase Schema
-- Complete DDL: enums, tables, constraints, triggers, RLS
-- ============================================================

-- ==================== ENUMS ====================

CREATE TYPE public.user_role AS ENUM (
  'fleet_manager',
  'driver',
  'safety_officer',
  'financial_analyst'
);

CREATE TYPE public.vehicle_status AS ENUM (
  'Available',
  'On Trip',
  'In Shop',
  'Retired'
);

CREATE TYPE public.driver_status AS ENUM (
  'Available',
  'On Trip',
  'Off Duty',
  'Suspended'
);

CREATE TYPE public.trip_status AS ENUM (
  'Draft',
  'Dispatched',
  'Completed',
  'Cancelled'
);

CREATE TYPE public.maintenance_status AS ENUM (
  'Active',
  'Closed'
);


-- ==================== TABLES ====================

-- Users (synced from auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role public.user_role NOT NULL DEFAULT 'driver',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT NOT NULL UNIQUE,          -- Rule 1
  name TEXT NOT NULL,
  type TEXT NOT NULL,                                -- e.g. Truck, Van, Bus
  max_load_capacity NUMERIC(10,2) NOT NULL CHECK (max_load_capacity > 0),
  odometer NUMERIC(12,2) NOT NULL DEFAULT 0,
  acquisition_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.vehicle_status NOT NULL DEFAULT 'Available',
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Drivers
CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  license_number TEXT NOT NULL UNIQUE,
  license_category TEXT NOT NULL,                    -- e.g. C, CE, D
  license_expiry_date DATE NOT NULL,
  contact_number TEXT,
  safety_score NUMERIC(4,1) DEFAULT 100.0 CHECK (safety_score >= 0 AND safety_score <= 100),
  status public.driver_status NOT NULL DEFAULT 'Available',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trips
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  destination TEXT NOT NULL,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  driver_id UUID NOT NULL REFERENCES public.drivers(id),
  cargo_weight NUMERIC(10,2) NOT NULL CHECK (cargo_weight > 0),
  planned_distance NUMERIC(10,2),
  actual_distance NUMERIC(10,2),
  fuel_consumed NUMERIC(10,2),
  revenue NUMERIC(12,2) DEFAULT 0,                  -- For ROI calculation
  status public.trip_status NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Maintenance Logs
CREATE TABLE public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  description TEXT NOT NULL,
  cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  status public.maintenance_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- Fuel Logs
CREATE TABLE public.fuel_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  liters NUMERIC(10,2) NOT NULL CHECK (liters > 0),
  cost NUMERIC(12,2) NOT NULL CHECK (cost > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Expenses
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
  type TEXT NOT NULL,                                -- e.g. Tires, Insurance, Tolls
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT
);


-- ==================== INDEXES ====================

CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_region ON public.vehicles(region);
CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_drivers_license_expiry ON public.drivers(license_expiry_date);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_vehicle ON public.trips(vehicle_id);
CREATE INDEX idx_trips_driver ON public.trips(driver_id);
CREATE INDEX idx_maintenance_vehicle ON public.maintenance_logs(vehicle_id);
CREATE INDEX idx_maintenance_status ON public.maintenance_logs(status);
CREATE INDEX idx_fuel_vehicle ON public.fuel_logs(vehicle_id);
CREATE INDEX idx_expenses_vehicle ON public.expenses(vehicle_id);


-- ==================== TRIGGER: Sync auth.users → public.users ====================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'driver'
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ==================== TRIGGER: Trip Dispatch (Rule 6) ====================
-- When trip status changes to 'Dispatched', set vehicle + driver to 'On Trip'

CREATE OR REPLACE FUNCTION public.handle_trip_dispatch()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle RECORD;
  v_driver RECORD;
BEGIN
  -- Only fire when status changes TO 'Dispatched' FROM 'Draft'
  IF NEW.status = 'Dispatched' AND OLD.status = 'Draft' THEN

    -- Validate vehicle is Available
    SELECT * INTO v_vehicle FROM public.vehicles WHERE id = NEW.vehicle_id FOR UPDATE;
    IF v_vehicle.status != 'Available' THEN
      RAISE EXCEPTION 'Vehicle % is not available (current status: %)', v_vehicle.registration_number, v_vehicle.status;
    END IF;

    -- Validate driver is Available and license not expired
    SELECT * INTO v_driver FROM public.drivers WHERE id = NEW.driver_id FOR UPDATE;
    IF v_driver.status != 'Available' THEN
      RAISE EXCEPTION 'Driver % is not available (current status: %)', v_driver.name, v_driver.status;
    END IF;
    IF v_driver.license_expiry_date < CURRENT_DATE THEN
      RAISE EXCEPTION 'Driver % has an expired license (expired: %)', v_driver.name, v_driver.license_expiry_date;
    END IF;

    -- Validate cargo weight
    IF NEW.cargo_weight > v_vehicle.max_load_capacity THEN
      RAISE EXCEPTION 'Cargo weight (%) exceeds vehicle max load capacity (%)', NEW.cargo_weight, v_vehicle.max_load_capacity;
    END IF;

    -- Set statuses
    UPDATE public.vehicles SET status = 'On Trip' WHERE id = NEW.vehicle_id;
    UPDATE public.drivers SET status = 'On Trip' WHERE id = NEW.driver_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trip_dispatch
  AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_dispatch();


-- ==================== TRIGGER: Trip Complete (Rule 7) ====================
-- When trip status changes to 'Completed', restore vehicle + driver to 'Available'

CREATE OR REPLACE FUNCTION public.handle_trip_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND OLD.status = 'Dispatched' THEN
    UPDATE public.vehicles SET status = 'Available' WHERE id = NEW.vehicle_id;
    UPDATE public.drivers SET status = 'Available' WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trip_complete
  AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_complete();


-- ==================== TRIGGER: Trip Cancel (Rule 8) ====================
-- When trip status changes to 'Cancelled' from 'Dispatched', restore statuses

CREATE OR REPLACE FUNCTION public.handle_trip_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Cancelled' AND OLD.status = 'Dispatched' THEN
    UPDATE public.vehicles SET status = 'Available' WHERE id = NEW.vehicle_id;
    UPDATE public.drivers SET status = 'Available' WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trip_cancel
  AFTER UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_cancel();


-- ==================== TRIGGER: Maintenance Create (Rule 9) ====================
-- Creating an Active maintenance_log sets vehicle to 'In Shop'

CREATE OR REPLACE FUNCTION public.handle_maintenance_create()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Active' THEN
    UPDATE public.vehicles SET status = 'In Shop' WHERE id = NEW.vehicle_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_maintenance_create
  AFTER INSERT ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_maintenance_create();


-- ==================== TRIGGER: Maintenance Close (Rule 10) ====================
-- Closing a maintenance_log restores vehicle to 'Available', unless Retired

CREATE OR REPLACE FUNCTION public.handle_maintenance_close()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle RECORD;
BEGIN
  IF NEW.status = 'Closed' AND OLD.status = 'Active' THEN
    SELECT * INTO v_vehicle FROM public.vehicles WHERE id = NEW.vehicle_id;
    IF v_vehicle.status != 'Retired' THEN
      UPDATE public.vehicles SET status = 'Available' WHERE id = NEW.vehicle_id;
    END IF;
    -- Set closed_at timestamp
    NEW.closed_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: BEFORE UPDATE so we can modify NEW.closed_at
CREATE TRIGGER on_maintenance_close
  BEFORE UPDATE ON public.maintenance_logs
  FOR EACH ROW EXECUTE FUNCTION public.handle_maintenance_close();


-- ==================== TRIGGER: Trip Create Validation (Rules 2-5) ====================
-- Validates vehicle/driver eligibility on trip INSERT

CREATE OR REPLACE FUNCTION public.handle_trip_create_validation()
RETURNS TRIGGER AS $$
DECLARE
  v_vehicle RECORD;
  v_driver RECORD;
BEGIN
  -- Rule 2: Vehicle must not be Retired or In Shop
  SELECT * INTO v_vehicle FROM public.vehicles WHERE id = NEW.vehicle_id;
  IF v_vehicle.status IN ('Retired', 'In Shop') THEN
    RAISE EXCEPTION 'Vehicle % cannot be assigned to trips (status: %)', v_vehicle.registration_number, v_vehicle.status;
  END IF;

  -- Rule 4: Vehicle must not already be On Trip
  IF v_vehicle.status = 'On Trip' THEN
    RAISE EXCEPTION 'Vehicle % is already on a trip', v_vehicle.registration_number;
  END IF;

  -- Rule 3: Driver must not be Suspended
  SELECT * INTO v_driver FROM public.drivers WHERE id = NEW.driver_id;
  IF v_driver.status = 'Suspended' THEN
    RAISE EXCEPTION 'Driver % is suspended and cannot be assigned to trips', v_driver.name;
  END IF;

  -- Rule 3: Driver license must not be expired
  IF v_driver.license_expiry_date < CURRENT_DATE THEN
    RAISE EXCEPTION 'Driver % has an expired license', v_driver.name;
  END IF;

  -- Rule 4: Driver must not already be On Trip
  IF v_driver.status = 'On Trip' THEN
    RAISE EXCEPTION 'Driver % is already on a trip', v_driver.name;
  END IF;

  -- Rule 5: Cargo weight must not exceed vehicle max load
  IF NEW.cargo_weight > v_vehicle.max_load_capacity THEN
    RAISE EXCEPTION 'Cargo weight (%) exceeds vehicle max load capacity (%)', NEW.cargo_weight, v_vehicle.max_load_capacity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_trip_create_validation
  BEFORE INSERT ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.handle_trip_create_validation();


-- ==================== ROW LEVEL SECURITY ====================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fuel_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ========== USERS TABLE RLS ==========
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Fleet managers can view all users"
  ON public.users FOR SELECT
  USING (public.get_user_role() = 'fleet_manager');


-- ========== VEHICLES TABLE RLS ==========
-- All authenticated users can read vehicles
CREATE POLICY "All roles can view vehicles"
  ON public.vehicles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fleet managers can insert/update/delete vehicles
CREATE POLICY "Fleet managers can insert vehicles"
  ON public.vehicles FOR INSERT
  WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY "Fleet managers can update vehicles"
  ON public.vehicles FOR UPDATE
  USING (public.get_user_role() = 'fleet_manager');

CREATE POLICY "Fleet managers can delete vehicles"
  ON public.vehicles FOR DELETE
  USING (public.get_user_role() = 'fleet_manager');


-- ========== DRIVERS TABLE RLS ==========
-- All authenticated users can read drivers
CREATE POLICY "All roles can view drivers"
  ON public.drivers FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fleet managers and safety officers can manage drivers
CREATE POLICY "Fleet managers and safety officers can insert drivers"
  ON public.drivers FOR INSERT
  WITH CHECK (public.get_user_role() IN ('fleet_manager', 'safety_officer'));

CREATE POLICY "Fleet managers and safety officers can update drivers"
  ON public.drivers FOR UPDATE
  USING (public.get_user_role() IN ('fleet_manager', 'safety_officer'));

CREATE POLICY "Fleet managers and safety officers can delete drivers"
  ON public.drivers FOR DELETE
  USING (public.get_user_role() IN ('fleet_manager', 'safety_officer'));


-- ========== TRIPS TABLE RLS ==========
-- All authenticated users can read trips
CREATE POLICY "All roles can view trips"
  ON public.trips FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fleet managers and drivers can create/update trips
CREATE POLICY "Fleet managers and drivers can insert trips"
  ON public.trips FOR INSERT
  WITH CHECK (public.get_user_role() IN ('fleet_manager', 'driver'));

CREATE POLICY "Fleet managers and drivers can update trips"
  ON public.trips FOR UPDATE
  USING (public.get_user_role() IN ('fleet_manager', 'driver'));

CREATE POLICY "Fleet managers can delete trips"
  ON public.trips FOR DELETE
  USING (public.get_user_role() = 'fleet_manager');


-- ========== MAINTENANCE LOGS TABLE RLS ==========
CREATE POLICY "All roles can view maintenance logs"
  ON public.maintenance_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Fleet managers can insert maintenance logs"
  ON public.maintenance_logs FOR INSERT
  WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY "Fleet managers can update maintenance logs"
  ON public.maintenance_logs FOR UPDATE
  USING (public.get_user_role() = 'fleet_manager');

CREATE POLICY "Fleet managers can delete maintenance logs"
  ON public.maintenance_logs FOR DELETE
  USING (public.get_user_role() = 'fleet_manager');


-- ========== FUEL LOGS TABLE RLS ==========
CREATE POLICY "All roles can view fuel logs"
  ON public.fuel_logs FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Fleet managers and drivers can insert fuel logs"
  ON public.fuel_logs FOR INSERT
  WITH CHECK (public.get_user_role() IN ('fleet_manager', 'driver'));

CREATE POLICY "Fleet managers can update fuel logs"
  ON public.fuel_logs FOR UPDATE
  USING (public.get_user_role() = 'fleet_manager');

CREATE POLICY "Fleet managers can delete fuel logs"
  ON public.fuel_logs FOR DELETE
  USING (public.get_user_role() = 'fleet_manager');


-- ========== EXPENSES TABLE RLS ==========
CREATE POLICY "All roles can view expenses"
  ON public.expenses FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Fleet managers can insert expenses"
  ON public.expenses FOR INSERT
  WITH CHECK (public.get_user_role() = 'fleet_manager');

CREATE POLICY "Fleet managers can update expenses"
  ON public.expenses FOR UPDATE
  USING (public.get_user_role() = 'fleet_manager');

CREATE POLICY "Fleet managers can delete expenses"
  ON public.expenses FOR DELETE
  USING (public.get_user_role() = 'fleet_manager');
