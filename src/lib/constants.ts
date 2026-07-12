// ============================================================
// TransitOps — Constants
// ============================================================

import { UserRole, VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus } from './types'

// Status badge color classes
export const VEHICLE_STATUS_COLORS: Record<VehicleStatus, string> = {
  'Available': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'On Trip': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'In Shop': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Retired': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
}

export const DRIVER_STATUS_COLORS: Record<DriverStatus, string> = {
  'Available': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'On Trip': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Off Duty': 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400',
  'Suspended': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const TRIP_STATUS_COLORS: Record<TripStatus, string> = {
  'Draft': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  'Dispatched': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'Cancelled': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  'Active': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Closed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

// Role display names and permissions
export const ROLE_LABELS: Record<UserRole, string> = {
  'fleet_manager': 'Fleet Manager',
  'driver': 'Driver',
  'safety_officer': 'Safety Officer',
  'financial_analyst': 'Financial Analyst',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  'fleet_manager': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'driver': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'safety_officer': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'financial_analyst': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}

// Navigation items and their role access
export interface NavItem {
  title: string
  href: string
  icon: string // lucide icon name
  roles: UserRole[] // which roles can see this
}

export const NAV_ITEMS: NavItem[] = [
  { title: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard', roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { title: 'Vehicles', href: '/dashboard/vehicles', icon: 'Truck', roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { title: 'Drivers', href: '/dashboard/drivers', icon: 'Users', roles: ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'] },
  { title: 'Trips', href: '/dashboard/trips', icon: 'Route', roles: ['fleet_manager', 'driver', 'safety_officer'] },
  { title: 'Maintenance', href: '/dashboard/maintenance', icon: 'Wrench', roles: ['fleet_manager', 'safety_officer'] },
  { title: 'Fuel & Expenses', href: '/dashboard/fuel-expenses', icon: 'Fuel', roles: ['fleet_manager', 'driver', 'financial_analyst'] },
  { title: 'Reports', href: '/dashboard/reports', icon: 'BarChart3', roles: ['fleet_manager', 'financial_analyst'] },
]

// Vehicle types
export const VEHICLE_TYPES = ['Truck', 'Van', 'Bus', 'Pickup', 'Trailer', 'Tanker'] as const

// Driver license categories
export const LICENSE_CATEGORIES = ['A', 'B', 'C', 'CE', 'D', 'DE'] as const

// Expense types
export const EXPENSE_TYPES = ['Tires', 'Insurance', 'Tolls', 'Parking', 'Fines', 'Repairs', 'Permits', 'Other'] as const

// Regions
export const REGIONS = ['North', 'South', 'East', 'West', 'Central'] as const
