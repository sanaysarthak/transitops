import { UserRole } from './types'

export const ROLE_LABELS: Record<UserRole, string> = {
  fleet_manager: 'Fleet Manager',
  driver: 'Driver',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
}

// Sidebar routes permission mapping
// If a route is NOT in the array for a role, they are unauthorized.
export const ROLE_ROUTES: Record<UserRole, string[]> = {
  fleet_manager: [
    '/dashboard',
    '/dashboard/vehicles',
    '/dashboard/drivers',
    '/dashboard/trips',
    '/dashboard/maintenance',
    '/dashboard/fuel-expenses',
    '/dashboard/reports',
  ],
  driver: [
    '/dashboard',
    '/dashboard/trips',
    '/dashboard/fuel-expenses',
  ],
  safety_officer: [
    '/dashboard',
    '/dashboard/drivers',
    '/dashboard/trips',
  ],
  financial_analyst: [
    '/dashboard',
    '/dashboard/vehicles',
    '/dashboard/drivers',
    '/dashboard/trips',
    '/dashboard/fuel-expenses',
    '/dashboard/reports',
  ],
}

export function hasRouteAccess(role: UserRole, path: string): boolean {
  const allowedRoutes = ROLE_ROUTES[role] || []
  return allowedRoutes.some(route => path === route || path.startsWith(route + '/'))
}

export const STATUS_COLORS = {
  // Vehicle Status
  vehicle: {
    Available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'On Trip': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'In Shop': 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Retired: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  },
  // Driver Status
  driver: {
    Available: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    'On Trip': 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    'Off Duty': 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    Suspended: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  // Trip Status
  trip: {
    Draft: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    Dispatched: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    Completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    Cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
  // Maintenance Status
  maintenance: {
    Active: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    Closed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
}
