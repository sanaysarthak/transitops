import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import Sidebar from '@/components/layout/sidebar'
import Topbar from '@/components/layout/topbar'
import { UserRole } from '@/lib/types'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', user.id)
    .single()

  const role = (profile?.role || 'fleet_manager') as UserRole
  const email = profile?.email || user.email || ''

  return (
    <div className="flex h-screen w-full flex-col overflow-hidden md:flex-row bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Navigation */}
      <Sidebar role={role} email={email} />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Topbar role={role} email={email} />

        {/* Dynamic Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto p-6 text-slate-800 dark:text-slate-100">
          {children}
        </main>
      </div>
    </div>
  )
}
