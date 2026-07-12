'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, Search, Filter, Loader2 } from 'lucide-react'
import { getVehicles, createVehicle, updateVehicle, deleteVehicle } from './actions'
import { Vehicle, VehicleStatus, UserRole } from '@/lib/types'
import { VEHICLE_STATUS_COLORS, VEHICLE_TYPES, REGIONS } from '@/lib/constants'
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

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole>('driver')

  // Filters state
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [regionFilter, setRegionFilter] = useState('all')

  // Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  // Fetch role and data
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
      const data = await getVehicles({
        type: typeFilter,
        status: statusFilter as any,
        region: regionFilter,
      })
      setVehicles(data)
    } catch (e: any) {
      toast.error('Failed to load vehicles: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Refetch when filters change
  useEffect(() => {
    fetchData()
  }, [typeFilter, statusFilter, regionFilter])

  const filteredVehicles = vehicles.filter(v =>
    v.registration_number.toLowerCase().includes(search.toLowerCase()) ||
    v.name.toLowerCase().includes(search.toLowerCase())
  )

  const isManager = role === 'fleet_manager'

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormLoading(true)
    const formData = new FormData(e.currentTarget)
    
    const input = {
      registration_number: formData.get('registration_number') as string,
      name: formData.get('name') as string,
      type: formData.get('type') as string,
      max_load_capacity: parseFloat(formData.get('max_load_capacity') as string),
      odometer: parseFloat(formData.get('odometer') as string || '0'),
      acquisition_cost: parseFloat(formData.get('acquisition_cost') as string || '0'),
      status: formData.get('status') as VehicleStatus || 'Available',
      region: formData.get('region') as string || undefined,
    }

    try {
      if (selectedVehicle) {
        const res = await updateVehicle(selectedVehicle.id, input)
        if (res.error) throw new Error(res.error)
        toast.success('Vehicle updated successfully')
      } else {
        const res = await createVehicle(input)
        if (res.error) throw new Error(res.error)
        toast.success('Vehicle added successfully')
      }
      setIsOpen(false)
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this vehicle?')) return
    try {
      const res = await deleteVehicle(id)
      if (res.error) throw new Error(res.error)
      toast.success('Vehicle deleted successfully')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Vehicle Registry</h1>
          <p className="text-muted-foreground">Manage and track fleet vehicles</p>
        </div>
        {isManager && (
          <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val)
            if (!val) setSelectedVehicle(null)
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{selectedVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</DialogTitle>
                  <DialogDescription>
                    Provide fleet vehicle configuration details below.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="registration_number">Registration Number *</Label>
                      <Input
                        id="registration_number"
                        name="registration_number"
                        defaultValue={selectedVehicle?.registration_number}
                        placeholder="MH-12-AB-1234"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Vehicle Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={selectedVehicle?.name}
                        placeholder="Tata Ace Gold"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="type">Vehicle Type *</Label>
                      <Select name="type" defaultValue={selectedVehicle?.type || VEHICLE_TYPES[0]}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_TYPES.map(t => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_load_capacity">Max Load Capacity (kg) *</Label>
                      <Input
                        id="max_load_capacity"
                        name="max_load_capacity"
                        type="number"
                        defaultValue={selectedVehicle?.max_load_capacity}
                        placeholder="1500"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="odometer">Odometer (km)</Label>
                      <Input
                        id="odometer"
                        name="odometer"
                        type="number"
                        step="0.1"
                        defaultValue={selectedVehicle?.odometer}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="acquisition_cost">Acquisition Cost (₹)</Label>
                      <Input
                        id="acquisition_cost"
                        name="acquisition_cost"
                        type="number"
                        defaultValue={selectedVehicle?.acquisition_cost}
                        placeholder="850000"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={selectedVehicle?.status || 'Available'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="On Trip">On Trip</SelectItem>
                          <SelectItem value="In Shop">In Shop</SelectItem>
                          <SelectItem value="Retired">Retired</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="region">Region</Label>
                      <Select name="region" defaultValue={selectedVehicle?.region || REGIONS[0]}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select region" />
                        </SelectTrigger>
                        <SelectContent>
                          {REGIONS.map(r => (
                            <SelectItem key={r} value={r}>{r}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={formLoading} className="bg-blue-600 text-white">
                    {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Vehicle
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filter Options */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search reg number or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="On Trip">On Trip</SelectItem>
                <SelectItem value="In Shop">In Shop</SelectItem>
                <SelectItem value="Retired">Retired</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {VEHICLE_TYPES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={regionFilter} onValueChange={regionFilter => setRegionFilter(regionFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Regions</SelectItem>
                {REGIONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registration Number</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Max Load</TableHead>
                <TableHead>Odometer</TableHead>
                <TableHead>Region</TableHead>
                {isManager && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground p-8">
                    No vehicles found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono font-bold">{vehicle.registration_number}</TableCell>
                    <TableCell>{vehicle.name}</TableCell>
                    <TableCell>{vehicle.type}</TableCell>
                    <TableCell>
                      <Badge className={VEHICLE_STATUS_COLORS[vehicle.status]}>
                        {vehicle.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{vehicle.max_load_capacity} kg</TableCell>
                    <TableCell>{vehicle.odometer.toLocaleString()} km</TableCell>
                    <TableCell>{vehicle.region || '—'}</TableCell>
                    {isManager && (
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedVehicle(vehicle)
                            setIsOpen(true)
                          }}
                        >
                          <Edit2 className="w-4 h-4 text-slate-400 hover:text-white" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(vehicle.id)}
                        >
                          <Trash2 className="w-4 h-4 text-red-500 hover:text-red-400" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
