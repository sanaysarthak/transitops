'use client'

import { usePathname } from 'next/navigation'
import { ROLE_LABELS, NAV_ITEMS } from '@/lib/constants'
import { UserRole } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Menu, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Truck, Users, Route, Wrench,
  Fuel, BarChart3, LogOut
} from 'lucide-react'
import { logout } from '@/app/(auth)/actions'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Truck, Users, Route, Wrench, Fuel, BarChart3,
}

interface TopbarProps {
  userRole: UserRole
  userEmail: string
}

export function Topbar({ userRole, userEmail }: TopbarProps) {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  // Find current page title
  const currentNav = NAV_ITEMS.find(
    item => pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
  )
  const pageTitle = currentNav?.title || 'Dashboard'

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(userRole))

  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0">
            <div className="flex items-center gap-3 px-4 h-16 border-b">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg leading-tight">TransitOps</h1>
                <p className="text-xs text-muted-foreground">Fleet Operations</p>
              </div>
            </div>
            <nav className="py-4 px-3 space-y-1">
              {filteredNav.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="px-3 mt-auto border-t pt-3">
              <p className="px-3 text-sm font-medium truncate">{userEmail}</p>
              <Badge variant="secondary" className="ml-3 mt-1 text-xs">{ROLE_LABELS[userRole]}</Badge>
              <form action={logout} className="mt-3">
                <Button type="submit" variant="ghost" className="w-full justify-start px-3">
                  <LogOut className="w-5 h-5 mr-3" />
                  Sign Out
                </Button>
              </form>
            </div>
          </SheetContent>
        </Sheet>

        <h2 className="text-lg font-semibold">{pageTitle}</h2>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant="outline" className="hidden sm:flex">
          {ROLE_LABELS[userRole]}
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </div>
    </header>
  )
}
