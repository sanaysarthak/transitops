'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Truck, Navigation, Wrench, UserCheck, PlayCircle, ClipboardList, TrendingUp, Loader2 } from 'lucide-react'
import { getVehicles } from './vehicles/actions'
import { getTrips } from './trips/actions'
import { getDrivers } from './drivers/actions'
import { Vehicle, Trip, Driver } from '@/lib/types'
import { KpiCard } from '@/components/dashboard/kpi-card'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { TRIP_STATUS_COLORS } from '@/lib/constants'

export default function DashboardPage() {
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [trips, setTrips] = useState<Trip[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])

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

  // KPI Calculations
  const totalActiveVehicles = vehicles.filter(v => v.status !== 'Retired').length
  const availableVehicles = vehicles.filter(v => v.status === 'Available').length
  const maintenanceVehicles = vehicles.filter(v => v.status === 'In Shop').length
  const onTripVehicles = vehicles.filter(v => v.status === 'On Trip').length

  const activeTripsCount = trips.filter(t => t.status === 'Dispatched').length
  const pendingTripsCount = trips.filter(t => t.status === 'Draft').length

  const driversOnDuty = drivers.filter(d => d.status === 'Available' || d.status === 'On Trip').length

  const utilizationRate = totalActiveVehicles > 0 ? Math.round((onTripVehicles / totalActiveVehicles) * 100) : 0

  // Recent 5 dispatched/completed trips
  const recentTrips = trips.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
        <p className="text-muted-foreground">Real-time status updates and fleet operations KPIs.</p>
      </div>

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

      {/* Recent Trips Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trips</CardTitle>
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
                    No trips logged yet.
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
    </div>
  )
}
