import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Truck, Users, MapPin, Wrench } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-xl font-bold tracking-tight md:text-2xl font-sans">Dashboard Overview</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Real-time summary of your fleet and operations.
        </p>
      </div>

      {/* KPI Cards Placeholder */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Active Vehicles', value: '4', change: '+1 this week', icon: Truck, color: 'text-blue-500' },
          { title: 'Registered Drivers', value: '4', change: 'All active licenses', icon: Users, color: 'text-emerald-500' },
          { title: 'Active Trips', value: '1', change: '2 dispatched, 1 draft', icon: MapPin, color: 'text-indigo-500' },
          { title: 'Maintenance Logs', value: '1 active', change: '1 resolved last week', icon: Wrench, color: 'text-amber-500' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <div key={idx} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm dark:border-slate-900 dark:bg-slate-900/50 transition-all hover:shadow-md">
              <div className="flex items-center justify-between space-y-0 pb-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">{kpi.title}</p>
                <Icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="mt-2">
                <div className="text-xl font-extrabold tracking-tight">{kpi.value}</div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{kpi.change}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Development Notice */}
      <div className="rounded-2xl border border-indigo-500/10 bg-indigo-500/5 p-6 dark:border-indigo-500/20">
        <h3 className="text-sm font-bold text-indigo-500 dark:text-indigo-400 mb-2 uppercase tracking-wider">
          Hackathon Project Module Initialization
        </h3>
        <p className="text-xs text-indigo-750 dark:text-indigo-300 leading-relaxed font-medium">
          The core infrastructure and authentication shell have been successfully configured on your branch (<code className="rounded bg-indigo-500/10 px-1 py-0.5 font-mono text-[10px]">feature/auth-core</code>). The remaining feature modules (Vehicles, Drivers, Trips, Maintenance, Fuel/Expenses, and Reports) are ready to be integrated by team members working on their respective branches.
        </p>
      </div>
    </div>
  )
}
