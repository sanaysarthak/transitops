import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'

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

  // Get user role from public.users table
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  const userRole = profile?.role || user.user_metadata?.role || 'driver'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar userRole={userRole} userEmail={user.email || ''} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar userRole={userRole} userEmail={user.email || ''} />
        <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
          {children}
        </main>
      </div>
    </div>
  )
}
