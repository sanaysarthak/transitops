import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import type { UserRole } from '@/lib/types'

// DEMO MODE: Supabase auth bypassed
const DEMO_USER = { email: 'demo@transitops.dev', role: 'fleet_manager' as UserRole }

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const userRole = DEMO_USER.role
  const userEmail = DEMO_USER.email

  return (
    <div className="flex h-screen overflow-hidden print:h-auto print:overflow-visible print:block">
      <div className="print:hidden">
        <Sidebar userRole={userRole} userEmail={userEmail} />
      </div>
      <div className="flex-1 flex flex-col overflow-hidden print:block print:overflow-visible">
        <div className="print:hidden">
          <Topbar userRole={userRole} userEmail={userEmail} />
        </div>
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30 print:p-0 print:bg-white print:overflow-visible print:block">
          {children}
        </main>
      </div>
    </div>
  )
}
