'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Check, X, Send, Search, Loader2 } from 'lucide-react'
import { getTrips, getValidVehicles, getValidDrivers, createTrip, dispatchTrip, completeTrip, cancelTrip } from './actions'
import { Trip, Vehicle, Driver, UserRole } from '@/lib/types'
import { TRIP_STATUS_COLORS } from '@/lib/constants'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [validVehicles, setValidVehicles] = useState<Vehicle[]>([])
  const [validDrivers, setValidDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole>('driver')

  // Search
  const [search, setSearch] = useState('')

  // Create Modal
  const [isOpen, setIsOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [cargoWeight, setCargoWeight] = useState('')

  // Complete Modal
  const [isCompleteOpen, setIsCompleteOpen] = useState(false)
  const [completingTripId, setCompletingTripId] = useState<string | null>(null)
  const [completeLoading, setCompleteLoading] = useState(false)

  // Fetch role, trips, and validation lists
  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        setRole(profile?.role || 'driver')
      }
      fetchData()
    }
    init()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const data = await getTrips()
      setTrips(data)

      const vList = await getValidVehicles()
      setValidVehicles(vList)

      const dList = await getValidDrivers()
      setValidDrivers(dList)
    } catch (e: any) {
      toast.error('Failed to load trips data: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Check if cargo weight exceeds capacity
  const selectedVehicle = validVehicles.find(v => v.id === selectedVehicleId)
  const isWeightInvalid = selectedVehicle && cargoWeight && parseFloat(cargoWeight) > selectedVehicle.max_load_capacity

  const canCreate = role === 'fleet_manager' || role === 'driver'

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isWeightInvalid) {
      toast.error('Cargo weight cannot exceed vehicle capacity!')
      return
    }
    setFormLoading(true)

    const formData = new FormData(e.currentTarget)
    const input = {
      source: formData.get('source') as string,
      destination: formData.get('destination') as string,
      vehicle_id: selectedVehicleId,
      driver_id: selectedDriverId,
      cargo_weight: parseFloat(cargoWeight),
      planned_distance: parseFloat(formData.get('planned_distance') as string || '0'),
      revenue: parseFloat(formData.get('revenue') as string || '0'),
    }

    try {
      const res = await createTrip(input)
      if (res.error) throw new Error(res.error)
      toast.success('Trip created as Draft')
      setIsOpen(false)
      setSelectedVehicleId('')
      setSelectedDriverId('')
      setCargoWeight('')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDispatch(id: string) {
    try {
      const res = await dispatchTrip(id)
      if (res.error) throw new Error(res.error)
      toast.success('Trip Dispatched successfully!')
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  async function handleCompleteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!completingTripId) return
    setCompleteLoading(true)

    const formData = new FormData(e.currentTarget)
    const input = {
      actual_distance: parseFloat(formData.get('actual_distance') as string),
      fuel_consumed: parseFloat(formData.get('fuel_consumed') as string),
      revenue: parseFloat(formData.get('revenue') as string || '0'),
    }

    try {
      const res = await completeTrip(completingTripId, input)
      if (res.error) throw new Error(res.error)
      toast.success('Trip Completed and vehicle/driver returned to Available')
      setIsCompleteOpen(false)
      setCompletingTripId(null)
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCompleteLoading(false)
    }
  }

  async function handleCancel(id: string) {
    if (!confirm('Are you sure you want to cancel this trip?')) return
    try {
      const res = await cancelTrip(id)
      if (res.error) throw new Error(res.error)
      toast.success('Trip Cancelled and resources returned to Available')
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filteredTrips = trips.filter(t =>
    t.source.toLowerCase().includes(search.toLowerCase()) ||
    t.destination.toLowerCase().includes(search.toLowerCase()) ||
    (t.vehicle?.registration_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.driver?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Trip Management</h1>
          <p className="text-muted-foreground">Manage and track trip dispatch and lifecycles</p>
        </div>
        {canCreate && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                <Plus className="w-4 h-4 mr-2" /> Plan New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Plan Trip</DialogTitle>
                  <DialogDescription>
                    Create a trip. Note: Expired license drivers, suspended profiles, retired vehicles, or currently busy resources are filtered out automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="source">Source *</Label>
                      <Input id="source" name="source" placeholder="Mumbai" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="destination">Destination *</Label>
                      <Input id="destination" name="destination" placeholder="Pune" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle_id">Assigned Vehicle *</Label>
                    <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Available Vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {validVehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.registration_number}) — Max {v.max_load_capacity}kg
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driver_id">Assigned Driver *</Label>
                    <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Available Driver" />
                      </SelectTrigger>
                      <SelectContent>
                        {validDrivers.map(d => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.name} (Safety: {d.safety_score}%)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="cargo_weight">Cargo Weight (kg) *</Label>
                      <Input
                        id="cargo_weight"
                        type="number"
                        value={cargoWeight}
                        onChange={(e) => setCargoWeight(e.target.value)}
                        placeholder="1200"
                        required
                      />
                      {isWeightInvalid && (
                        <p className="text-xs text-red-500 font-medium">Exceeds vehicle capacity!</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="planned_distance">Distance (km)</Label>
                      <Input id="planned_distance" name="planned_distance" type="number" placeholder="150" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="revenue">Revenue (₹)</Label>
                    <Input id="revenue" name="revenue" type="number" placeholder="15000" />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={formLoading || isWeightInvalid || !selectedVehicleId || !selectedDriverId} className="bg-blue-600 text-white">
                    {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Draft Trip
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search Filter */}
      <Card>
        <CardContent className="p-4 flex gap-4 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search source, destination, vehicle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Trips Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Route</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Cargo Weight</TableHead>
                <TableHead>Revenue</TableHead>
                <TableHead>Planned / Actual Distance</TableHead>
                <TableHead>Fuel Consumed</TableHead>
                <TableHead>Status</TableHead>
                {canCreate && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground p-8">
                    No trips found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip) => (
                  <TableRow key={trip.id}>
                    <TableCell className="font-semibold">
                      {trip.source} → {trip.destination}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {trip.vehicle ? `${trip.vehicle.name} (${trip.vehicle.registration_number})` : '—'}
                    </TableCell>
                    <TableCell>{trip.driver ? trip.driver.name : '—'}</TableCell>
                    <TableCell>{trip.cargo_weight} kg</TableCell>
                    <TableCell>{trip.revenue ? `₹${trip.revenue.toLocaleString()}` : '₹0'}</TableCell>
                    <TableCell>
                      {trip.planned_distance || '0'} km / {trip.actual_distance !== null ? `${trip.actual_distance} km` : '—'}
                    </TableCell>
                    <TableCell>{trip.fuel_consumed !== null ? `${trip.fuel_consumed} L` : '—'}</TableCell>
                    <TableCell>
                      <Badge className={TRIP_STATUS_COLORS[trip.status]}>
                        {trip.status}
                      </Badge>
                    </TableCell>
                    {canCreate && (
                      <TableCell className="text-right space-x-1">
                        {trip.status === 'Draft' && (
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-500 text-white gap-1"
                            onClick={() => handleDispatch(trip.id)}
                          >
                            <Send className="w-3.5 h-3.5" /> Dispatch
                          </Button>
                        )}
                        {trip.status === 'Dispatched' && (
                          <>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                              onClick={() => {
                                setCompletingTripId(trip.id)
                                setIsCompleteOpen(true)
                              }}
                            >
                              <Check className="w-3.5 h-3.5" /> Complete
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="gap-1 bg-red-600"
                              onClick={() => handleCancel(trip.id)}
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </Button>
                          </>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Complete Trip Dialog */}
      <Dialog open={isCompleteOpen} onOpenChange={setIsCompleteOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <form onSubmit={handleCompleteSubmit}>
            <DialogHeader>
              <DialogTitle>Complete Trip</DialogTitle>
              <DialogDescription>
                Provide final trip statistics to close this dispatch.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="actual_distance">Actual Distance Completed (km) *</Label>
                <Input id="actual_distance" name="actual_distance" type="number" step="0.1" required placeholder="148.5" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fuel_consumed">Actual Fuel Consumed (liters) *</Label>
                <Input id="fuel_consumed" name="fuel_consumed" type="number" step="0.1" required placeholder="22.3" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revenue">Updated Revenue (₹)</Label>
                <Input id="revenue" name="revenue" type="number" placeholder="15000" />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={completeLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white">
                {completeLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm Completion
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
