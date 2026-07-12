export type UserRole = 'fleet_manager' | 'driver' | 'safety_officer' | 'financial_analyst';

export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired';
export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended';
export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled';
export type MaintenanceStatus = 'Active' | 'Closed';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  created_at: string;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  name: string;
  type: string;
  status: VehicleStatus;
  region: string;
  odometer: number;
  max_load_capacity: number;
  acquisition_cost: number;
  created_at: string;
}

export interface Driver {
  id: string;
  user_id: string | null;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry: string;
  contact_number: string;
  safety_score: number;
  status: DriverStatus;
  created_at: string;
}

export interface Trip {
  id: string;
  source: string;
  destination: string;
  vehicle_id: string | null;
  driver_id: string | null;
  cargo_weight: number;
  distance: number | null;
  fuel_consumed: number | null;
  status: TripStatus;
  created_at: string;
  vehicles?: Vehicle;
  drivers?: Driver;
}

export interface MaintenanceLog {
  id: string;
  vehicle_id: string;
  description: string;
  cost: number;
  status: MaintenanceStatus;
  created_at: string;
  closed_at: string | null;
  vehicles?: Vehicle;
}

export interface FuelLog {
  id: string;
  vehicle_id: string;
  liters: number;
  cost: number;
  date: string;
  created_at: string;
  vehicles?: Vehicle;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  type: string;
  amount: number;
  date: string;
  notes: string | null;
  created_at: string;
  vehicles?: Vehicle;
}
