'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Edit2, Trash2, Search, Filter, Loader2, AlertTriangle } from 'lucide-react'
import { getDrivers, createDriver, updateDriver, deleteDriver } from './actions'
import { Driver, DriverStatus, UserRole } from '@/lib/types'
import { DRIVER_STATUS_COLORS, LICENSE_CATEGORIES } from '@/lib/constants'
import { createClient } from '@/utils/supabase/client'
import { differenceInDays, parseISO, isPast } from 'date-fns'
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

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole>('driver')

  // Search/Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal State
  const [isOpen, setIsOpen] = useState(false)
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [formLoading, setFormLoading] = useState(false)

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
      const data = await getDrivers({
        status: statusFilter as any,
      })
      setDrivers(data)
    } catch (e: any) {
      toast.error('Failed to load drivers: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  // Refetch when filter changes
  useEffect(() => {
    fetchData()
  }, [statusFilter])

  const filteredDrivers = drivers.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.license_number.toLowerCase().includes(search.toLowerCase())
  )

  const canManage = role === 'fleet_manager' || role === 'safety_officer'

  // Helper to format/check license expiry status
  function getLicenseExpiryBadge(dateStr: string) {
    const expiryDate = parseISO(dateStr)
    const daysLeft = differenceInDays(expiryDate, new Date())

    if (isPast(expiryDate)) {
      return (
        <Badge variant="destructive" className="flex items-center gap-1 w-fit bg-red-600">
          <AlertTriangle className="w-3.5 h-3.5" /> Expired
        </Badge>
      )
    } else if (daysLeft < 30) {
      return (
        <Badge className="flex items-center gap-1 w-fit bg-amber-600 text-white">
          <AlertTriangle className="w-3.5 h-3.5" /> Expiring ({daysLeft}d)
        </Badge>
      )
    } else {
      return (
        <Badge variant="outline" className="border-emerald-600 text-emerald-500 w-fit">
          Valid
        </Badge>
      )
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormLoading(true)
    const formData = new FormData(e.currentTarget)

    const input = {
      name: formData.get('name') as string,
      license_number: formData.get('license_number') as string,
      license_category: formData.get('license_category') as string,
      license_expiry_date: formData.get('license_expiry_date') as string,
      contact_number: formData.get('contact_number') as string || undefined,
      safety_score: parseFloat(formData.get('safety_score') as string || '100'),
      status: formData.get('status') as DriverStatus || 'Available',
    }

    try {
      if (selectedDriver) {
        const res = await updateDriver(selectedDriver.id, input)
        if (res.error) throw new Error(res.error)
        toast.success('Driver updated successfully')
      } else {
        const res = await createDriver(input)
        if (res.error) throw new Error(res.error)
        toast.success('Driver added successfully')
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
    if (!confirm('Are you sure you want to delete this driver?')) return
    try {
      const res = await deleteDriver(id)
      if (res.error) throw new Error(res.error)
      toast.success('Driver deleted successfully')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Driver Directory</h1>
          <p className="text-muted-foreground">Manage compliance, license status, and safety profiles</p>
        </div>
        {canManage && (
          <Dialog open={isOpen} onOpenChange={(val) => {
            setIsOpen(val)
            if (!val) setSelectedDriver(null)
          }}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                <Plus className="w-4 h-4 mr-2" /> Add Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{selectedDriver ? 'Edit Driver' : 'Add Driver'}</DialogTitle>
                  <DialogDescription>
                    Provide compliance and license information below.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        defaultValue={selectedDriver?.name}
                        placeholder="Rajesh Kumar"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact_number">Contact Number</Label>
                      <Input
                        id="contact_number"
                        name="contact_number"
                        defaultValue={selectedDriver?.contact_number || ''}
                        placeholder="+91-9876543210"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="license_number">License Number *</Label>
                      <Input
                        id="license_number"
                        name="license_number"
                        defaultValue={selectedDriver?.license_number}
                        placeholder="DL-0420110012345"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license_category">License Class *</Label>
                      <Select name="license_category" defaultValue={selectedDriver?.license_category || LICENSE_CATEGORIES[0]}>
                        <SelectTrigger>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent>
                          {LICENSE_CATEGORIES.map(c => (
                            <SelectItem key={c} value={c}>Class {c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_expiry_date">License Expiry Date *</Label>
                    <Input
                      id="license_expiry_date"
                      name="license_expiry_date"
                      type="date"
                      defaultValue={selectedDriver?.license_expiry_date}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="safety_score">Safety Score (0 - 100)</Label>
                      <Input
                        id="safety_score"
                        name="safety_score"
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        defaultValue={selectedDriver?.safety_score || 100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select name="status" defaultValue={selectedDriver?.status || 'Available'}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Available">Available</SelectItem>
                          <SelectItem value="On Trip">On Trip</SelectItem>
                          <SelectItem value="Off Duty">Off Duty</SelectItem>
                          <SelectItem value="Suspended">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={formLoading} className="bg-blue-600 text-white">
                    {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Save Driver
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or license..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 items-center w-full sm:w-auto">
            <Filter className="w-4 h-4 text-muted-foreground hidden sm:block" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="On Trip">On Trip</SelectItem>
                <SelectItem value="Off Duty">Off Duty</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>License Number</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>License Expiry</TableHead>
                <TableHead>Compliance Badge</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Safety Score</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDrivers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground p-8">
                    No drivers found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDrivers.map((driver) => (
                  <TableRow key={driver.id}>
                    <TableCell className="font-medium">{driver.name}</TableCell>
                    <TableCell className="font-mono text-xs">{driver.license_number}</TableCell>
                    <TableCell>Class {driver.license_category}</TableCell>
                    <TableCell>{driver.license_expiry_date}</TableCell>
                    <TableCell>{getLicenseExpiryBadge(driver.license_expiry_date)}</TableCell>
                    <TableCell>{driver.contact_number || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-12 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              driver.safety_score >= 85 ? 'bg-emerald-500' : driver.safety_score >= 70 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${driver.safety_score}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold">{driver.safety_score}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={DRIVER_STATUS_COLORS[driver.status]}>
                        {driver.status}
                      </Badge>
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right space-x-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDriver(driver)
                            setIsOpen(true)
                          }}
                        >
                          <Edit2 className="w-4 h-4 text-slate-400 hover:text-white" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(driver.id)}
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
