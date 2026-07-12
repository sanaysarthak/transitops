// ============================================================
// TransitOps — TypeScript Types (matching Supabase schema)
// ============================================================

export type UserRole = 'fleet_manager' | 'driver' | 'safety_officer' | 'financial_analyst'
export type VehicleStatus = 'Available' | 'On Trip' | 'In Shop' | 'Retired'
export type DriverStatus = 'Available' | 'On Trip' | 'Off Duty' | 'Suspended'
export type TripStatus = 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled'
export type MaintenanceStatus = 'Active' | 'Closed'

export interface User {
  id: string
  email: string
  role: UserRole
  created_at: string
}

export interface Vehicle {
  id: string
  registration_number: string
  name: string
  type: string
  max_load_capacity: number
  odometer: number
  acquisition_cost: number
  status: VehicleStatus
  region: string | null
  created_at: string
}

export interface Driver {
  id: string
  name: string
  license_number: string
  license_category: string
  license_expiry_date: string
  contact_number: string | null
  safety_score: number
  status: DriverStatus
  created_at: string
}

export interface Trip {
  id: string
  source: string
  destination: string
  vehicle_id: string
  driver_id: string
  cargo_weight: number
  planned_distance: number | null
  actual_distance: number | null
  fuel_consumed: number | null
  revenue: number | null
  status: TripStatus
  created_at: string
  // Joined relations
  vehicle?: Vehicle
  driver?: Driver
}

export interface MaintenanceLog {
  id: string
  vehicle_id: string
  description: string
  cost: number
  status: MaintenanceStatus
  created_at: string
  closed_at: string | null
  // Joined
  vehicle?: Vehicle
}

export interface FuelLog {
  id: string
  vehicle_id: string
  liters: number
  cost: number
  date: string
  // Joined
  vehicle?: Vehicle
}

export interface Expense {
  id: string
  vehicle_id: string
  type: string
  amount: number
  date: string
  notes: string | null
  // Joined
  vehicle?: Vehicle
}

// Form types for create/update operations
export interface CreateVehicleInput {
  registration_number: string
  name: string
  type: string
  max_load_capacity: number
  odometer?: number
  acquisition_cost?: number
  status?: VehicleStatus
  region?: string
}

export interface CreateDriverInput {
  name: string
  license_number: string
  license_category: string
  license_expiry_date: string
  contact_number?: string
  safety_score?: number
  status?: DriverStatus
}

export interface CreateTripInput {
  source: string
  destination: string
  vehicle_id: string
  driver_id: string
  cargo_weight: number
  planned_distance?: number
  revenue?: number
}

export interface CompleteTripInput {
  actual_distance: number
  fuel_consumed: number
  revenue?: number
}

export interface CreateMaintenanceInput {
  vehicle_id: string
  description: string
  cost: number
}

export interface CreateFuelLogInput {
  vehicle_id: string
  liters: number
  cost: number
  date: string
}

export interface CreateExpenseInput {
  vehicle_id: string
  type: string
  amount: number
  date: string
  notes?: string
}
