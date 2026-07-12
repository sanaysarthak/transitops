'use client'

import { usePathname } from 'next/navigation'
import { Bell, Search, ShieldCheck } from 'lucide-react'
import { UserRole } from '@/lib/types'
import { ROLE_LABELS } from '@/lib/constants'

interface TopbarProps {
  role: UserRole
  email: string
}

export default function Topbar({ role, email }: TopbarProps) {
  const pathname = usePathname()

  const getPageTitle = (path: string) => {
    if (path === '/dashboard') return 'Overview Dashboard'
    if (path.startsWith('/dashboard/vehicles')) return 'Vehicle Registry'
    if (path.startsWith('/dashboard/drivers')) return 'Drivers Management'
    if (path.startsWith('/dashboard/trips')) return 'Trip Lifecycle Management'
    if (path.startsWith('/dashboard/maintenance')) return 'Maintenance Logs'
    if (path.startsWith('/dashboard/fuel-expenses')) return 'Fuel & Expense Tracker'
    if (path.startsWith('/dashboard/reports')) return 'Reports & Fleet Analytics'
    return 'Dashboard'
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-100 bg-white/70 px-6 backdrop-blur-md dark:border-slate-900 dark:bg-slate-950/70 text-slate-800 dark:text-slate-100">
      {/* Title */}
      <div>
        <h1 className="text-base font-bold tracking-tight md:text-lg font-sans">
          {getPageTitle(pathname)}
        </h1>
      </div>

      {/* Action Items */}
      <div className="flex items-center gap-4">
        {/* Quick Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Quick search..."
            className="w-48 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-xs outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-900/60 dark:focus:bg-slate-900 transition-all"
          />
        </div>

        {/* Notifications Icon */}
        <button className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-500 dark:hover:bg-slate-900 dark:hover:text-white transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-indigo-650 animate-pulse" />
        </button>

        {/* Role Badge Indicator */}
        <div className="flex items-center gap-2 rounded-xl border border-indigo-500/10 bg-indigo-500/5 px-3 py-1.5 text-xs text-indigo-500 dark:text-indigo-400">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
          <span className="font-semibold uppercase tracking-wider text-[9px]">
            {ROLE_LABELS[role]} Mode
          </span>
        </div>
      </div>
    </header>
  )
}
