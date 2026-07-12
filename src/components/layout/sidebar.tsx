'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/app/(auth)/actions'
import { UserRole } from '@/lib/types'
import { ROLE_ROUTES, ROLE_LABELS } from '@/lib/constants'
import {
  LayoutDashboard,
  Truck,
  Users,
  MapPin,
  Wrench,
  DollarSign,
  BarChart3,
  LogOut,
  Menu,
  X,
  User,
} from 'lucide-react'

interface SidebarProps {
  role: UserRole
  email: string
}

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    path: '/dashboard/vehicles',
    label: 'Vehicles',
    icon: Truck,
  },
  {
    path: '/dashboard/drivers',
    label: 'Drivers',
    icon: Users,
  },
  {
    path: '/dashboard/trips',
    label: 'Trips',
    icon: MapPin,
  },
  {
    path: '/dashboard/maintenance',
    label: 'Maintenance',
    icon: Wrench,
  },
  {
    path: '/dashboard/fuel-expenses',
    label: 'Fuel & Expenses',
    icon: DollarSign,
  },
  {
    path: '/dashboard/reports',
    label: 'Reports & Analytics',
    icon: BarChart3,
  },
]

export default function Sidebar({ role, email }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  // Filter navigation items based on role routes
  const allowedRoutes = ROLE_ROUTES[role] || []
  const visibleNavItems = NAV_ITEMS.filter((item) => allowedRoutes.includes(item.path))

  const handleLogout = async () => {
    await logout()
  }

  const roleLabel = ROLE_LABELS[role] || role

  const roleBadgeColors: Record<UserRole, string> = {
    fleet_manager: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    driver: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    safety_officer: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    financial_analyst: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  }

  return (
    <>
      {/* Mobile Header with Hamburger */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800 bg-slate-950 px-4 md:hidden text-white">
        <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-indigo-400">
          <Truck className="h-6 w-6" />
          <span>TransitOps</span>
        </Link>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-lg p-2 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors focus:outline-none"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800/80 bg-slate-950 text-slate-300 transition-all duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header - Hidden on mobile because of Mobile Header */}
        <div className="hidden h-16 items-center border-b border-slate-900 px-6 md:flex">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold text-xl text-white group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white transition-transform group-hover:scale-105">
              <Truck className="h-5 w-5" />
            </div>
            <span className="tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-400 bg-clip-text text-transparent">TransitOps</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto">
          {visibleNavItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.path
            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 group ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/10'
                    : 'hover:bg-slate-900 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white transition-colors'}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile Card & Logout */}
        <div className="border-t border-slate-900 p-4 space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-900/40 border border-slate-900 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300">
              <User className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-200">{email}</p>
              <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold mt-1 uppercase ${roleBadgeColors[role]}`}>
                {roleLabel}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Overlay - Mobile Only */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  )
}
