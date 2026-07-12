'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { 
  Truck, 
  Navigation, 
  Wrench, 
  UserCheck, 
  PlayCircle, 
  ClipboardList, 
  TrendingUp, 
  Loader2, 
  AlertTriangle, 
  CalendarClock, 
  ShieldAlert,
  RotateCcw
} from 'lucide-react'
import { getVehicles } from './vehicles/actions'
import { getTrips } from './trips/actions'
import { getDrivers } from './drivers/actions'
import { Vehicle, Trip, Driver } from '@/lib/types'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TRIP_STATUS_COLORS, VEHICLE_TYPES, REGIONS } from '@/lib/constants'
import { differenceInDays, parseISO, isPast } from 'date-fns'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])

  // Dashboard filter state
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [regionFilter, setRegionFilter] = useState<string>('all')

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const vList = await getVehicles()
        const tList = await getTrips()
        const dList = await getDrivers()
        setVehicles(vList)
        setTrips(tList)
        setDrivers(dList)
      } catch (e: any) {
        toast.error('Failed to load dashboard metrics: ' + e.message)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  // Active filters helper
  const handleResetFilters = () => {
    setTypeFilter('all')
    setStatusFilter('all')
    setRegionFilter('all')
    toast.success('Filters reset successfully')
  }

  // Apply filters to vehicles
  const filteredVehicles = vehicles.filter(v => {
    const matchesType = typeFilter === 'all' || v.type === typeFilter
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    const matchesRegion = regionFilter === 'all' || v.region === regionFilter
    return matchesType && matchesStatus && matchesRegion
  })

  // Apply filters to trips (trips associated with filtered vehicles)
  const filteredTrips = trips.filter(t => {
    if (!t.vehicle) return typeFilter === 'all' && statusFilter === 'all' && regionFilter === 'all'
    const matchesType = typeFilter === 'all' || t.vehicle.type === typeFilter
    const matchesStatus = statusFilter === 'all' || t.vehicle.status === statusFilter
    const matchesRegion = regionFilter === 'all' || t.vehicle.region === regionFilter
    return matchesType && matchesStatus && matchesRegion
  })

  // Apply filters to drivers on duty (drivers assigned to active trips matching vehicle filters)
  const filteredDrivers = drivers.filter(d => {
    if (typeFilter === 'all' && statusFilter === 'all' && regionFilter === 'all') return true
    
    // Safety score / Status filters or associated trip vehicle filter
    const activeTrip = trips.find(t => t.driver_id === d.id && t.status === 'Dispatched')
    if (!activeTrip || !activeTrip.vehicle) return false
    
    const v = activeTrip.vehicle
    const matchesType = typeFilter === 'all' || v.type === typeFilter
    const matchesStatus = statusFilter === 'all' || v.status === statusFilter
    const matchesRegion = regionFilter === 'all' || v.region === regionFilter
    return matchesType && matchesStatus && matchesRegion
  })

  // KPI Calculations (based on filtered data)
  const totalActiveVehicles = filteredVehicles.filter(v => v.status !== 'Retired').length
  const availableVehicles = filteredVehicles.filter(v => v.status === 'Available').length
  const maintenanceVehicles = filteredVehicles.filter(v => v.status === 'In Shop').length
  const onTripVehicles = filteredVehicles.filter(v => v.status === 'On Trip').length

  const activeTripsCount = filteredTrips.filter(t => t.status === 'Dispatched').length
  const pendingTripsCount = filteredTrips.filter(t => t.status === 'Draft').length

  // Drivers on duty
  const driversOnDuty = filteredDrivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length

  // Fleet Utilization rate
  const utilizationRate = totalActiveVehicles > 0 ? Math.round((onTripVehicles / totalActiveVehicles) * 100) : 0

  // Recent 5 filtered trips
  const recentTrips = filteredTrips.slice(0, 5)

  // Chart Data: Vehicles by Status
  const vehicleStatusChartData = [
    { name: 'Available', value: availableVehicles },
    { name: 'On Trip', value: onTripVehicles },
    { name: 'In Shop', value: maintenanceVehicles },
    { name: 'Retired', value: filteredVehicles.filter(v => v.status === 'Retired').length },
  ].filter(item => item.value > 0)

  // Chart Data: Trips status overview (from filteredTrips)
  const tripsStatusChartData = [
    { name: 'Draft', count: filteredTrips.filter(t => t.status === 'Draft').length, fill: '#64748b' },
    { name: 'Dispatched', count: filteredTrips.filter(t => t.status === 'Dispatched').length, fill: '#3b82f6' },
    { name: 'Completed', count: filteredTrips.filter(t => t.status === 'Completed').length, fill: '#10b981' },
    { name: 'Cancelled', count: filteredTrips.filter(t => t.status === 'Cancelled').length, fill: '#ef4444' },
  ]

  // compliance Alerts list (analyzing all drivers and vehicles regardless of filter for fleet manager safety awareness)
  const activeAlerts: Array<{ id: string; type: 'warning' | 'critical'; title: string; message: string; icon: any }> = []

  // Check driver licenses
  drivers.forEach(d => {
    const expiryDate = parseISO(d.license_expiry_date)
    const daysLeft = differenceInDays(expiryDate, new Date())

    if (isPast(expiryDate)) {
      activeAlerts.push({
        id: `driver-expired-${d.id}`,
        type: 'critical',
        title: 'Expired License',
        message: `Driver ${d.name}'s license expired on ${new Date(d.license_expiry_date).toLocaleDateString()}.`,
        icon: ShieldAlert
      })
    } else if (daysLeft < 30) {
      activeAlerts.push({
        id: `driver-expiring-${d.id}`,
        type: 'warning',
        title: 'License Expiring Soon',
        message: `Driver ${d.name}'s license expires in ${daysLeft} days (${new Date(d.license_expiry_date).toLocaleDateString()}).`,
        icon: CalendarClock
      })
    }

    if (d.status === 'Suspended') {
      activeAlerts.push({
        id: `driver-suspended-${d.id}`,
        type: 'critical',
        title: 'Driver Suspended',
        message: `Driver ${d.name} is currently flagged as Suspended.`,
        icon: ShieldAlert
      })
    }
  })

  // Check vehicle maintenance and retirement status
  vehicles.forEach(v => {
    if (v.status === 'In Shop') {
      activeAlerts.push({
        id: `veh-maint-${v.id}`,
        type: 'warning',
        title: 'Vehicle in Shop',
        message: `Vehicle ${v.name} (${v.registration_number}) is in maintenance.`,
        icon: Wrench
      })
    }
  })

  return (
    <div className="space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
          <p className="text-muted-foreground">Real-time status updates and fleet operations KPIs.</p>
        </div>
        
        {/* Print PDF trigger for report */}
        <Button 
          variant="outline" 
          onClick={() => window.print()}
          className="print:hidden w-fit shadow-xs"
        >
          Print Report / PDF
        </Button>
      </div>

      {/* Interactive Filters Card */}
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            Operations & Fleet Filters
          </CardTitle>
          <CardDescription>Filter KPI data, charts, and tables dynamically by vehicle fields.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
            {/* Vehicle Type Filter */}
            <div className="flex flex-col gap-1.5 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground">Vehicle Type</label>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? 'all')}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {VEHICLE_TYPES.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Vehicle Status Filter */}
            <div className="flex flex-col gap-1.5 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground">Vehicle Status</label>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? 'all')}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="On Trip">On Trip</SelectItem>
                  <SelectItem value="In Shop">In Shop</SelectItem>
                  <SelectItem value="Retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Region Filter */}
            <div className="flex flex-col gap-1.5 min-w-[150px]">
              <label className="text-xs font-medium text-muted-foreground">Region</label>
              <Select value={regionFilter} onValueChange={(v) => setRegionFilter(v ?? 'all')}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="All regions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {REGIONS.map(reg => (
                    <SelectItem key={reg} value={reg}>{reg}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset Button */}
            {(typeFilter !== 'all' || statusFilter !== 'all' || regionFilter !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleResetFilters}
                className="h-9 gap-1 text-red-500 hover:text-red-600 font-medium"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Grid of KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Active Vehicles"
          value={totalActiveVehicles}
          description="Total non-retired in fleet"
          icon={Truck}
          iconClassName="text-blue-500"
        />
        <KpiCard
          title="Available Vehicles"
          value={availableVehicles}
          description="Ready for dispatch assignment"
          icon={UserCheck}
          iconClassName="text-emerald-500"
        />
        <KpiCard
          title="Vehicles in Maintenance"
          value={maintenanceVehicles}
          description="Currently booked in shop"
          icon={Wrench}
          iconClassName="text-amber-500"
        />
        <KpiCard
          title="Drivers on Duty"
          value={driversOnDuty}
          description="Available or active on trip"
          icon={Navigation}
          iconClassName="text-indigo-500"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          title="Active Dispatched Trips"
          value={activeTripsCount}
          description="Trips currently en-route"
          icon={PlayCircle}
          iconClassName="text-sky-500"
        />
        <KpiCard
          title="Pending Trips"
          value={pendingTripsCount}
          description="Saved draft trip schedules"
          icon={ClipboardList}
          iconClassName="text-slate-500"
        />
        <KpiCard
          title="Fleet Utilization Rate"
          value={`${utilizationRate}%`}
          description="Active on trip / Total active vehicles"
          icon={TrendingUp}
          iconClassName="text-emerald-500"
        />
      </div>

      {/* Visual Analytics / Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trips Status Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Fleet Dispatches</CardTitle>
            <CardDescription>Number of trips organized by current status lifecycle phase.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] pt-4">
            {filteredTrips.length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                No trip records matching current filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tripsStatusChartData} barSize={40}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {tripsStatusChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Vehicles by Status Pie Chart */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Vehicle Inventory Status</CardTitle>
            <CardDescription>Visual state breakdown of non-retired vehicles.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px] flex items-center justify-center">
            {vehicleStatusChartData.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center">No vehicle data available.</div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                <div className="w-full h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vehicleStatusChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {vehicleStatusChartData.map((entry, index) => {
                          let color = '#3b82f6'
                          if (entry.name === 'Available') color = '#10b981'
                          if (entry.name === 'In Shop') color = '#f59e0b'
                          if (entry.name === 'Retired') color = '#64748b'
                          return <Cell key={`cell-${index}`} fill={color} />
                        })}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
                  {vehicleStatusChartData.map((entry, index) => {
                    let color = '#3b82f6'
                    if (entry.name === 'Available') color = '#10b981'
                    if (entry.name === 'In Shop') color = '#f59e0b'
                    if (entry.name === 'Retired') color = '#64748b'
                    return (
                      <div key={entry.name} className="flex items-center gap-1.5 text-xs font-medium">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span>{entry.name}: {entry.value}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Trips Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Trips</CardTitle>
            <CardDescription>Status tracker for the latest planned and active dispatches.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Cargo Weight</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground p-6">
                      No trips logged yet matching current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTrips.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.source} → {t.destination}</TableCell>
                      <TableCell className="font-mono text-xs">{t.vehicle?.registration_number || '—'}</TableCell>
                      <TableCell>{t.driver?.name || '—'}</TableCell>
                      <TableCell>{t.cargo_weight} kg</TableCell>
                      <TableCell>
                        <Badge className={TRIP_STATUS_COLORS[t.status]}>{t.status}</Badge>
                      </TableCell>
                      <TableCell>{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Real-Time Compliance Alerts Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-amber-500">
              <AlertTriangle className="w-5 h-5" /> Compliance & Safety Alerts
            </CardTitle>
            <CardDescription>Active registry warnings, license expiries, and shop events.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {activeAlerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-muted-foreground border border-dashed rounded-lg border-muted/80 h-[200px]">
                  <p className="text-sm font-semibold text-emerald-500 mb-1">✓ Fleet 100% Compliant</p>
                  <p className="text-xs">No active license expiries or critical driver flags detected.</p>
                </div>
              ) : (
                activeAlerts.map((alert) => {
                  const Icon = alert.icon
                  return (
                    <div 
                      key={alert.id} 
                      className={`p-3 rounded-lg border flex gap-3 text-xs leading-relaxed ${
                        alert.type === 'critical' 
                          ? 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400' 
                          : 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold mb-0.5">{alert.title}</p>
                        <p className="font-medium text-muted-foreground leading-normal">{alert.message}</p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
