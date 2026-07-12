'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Check, Search, Loader2, Wrench } from 'lucide-react'
import { getMaintenanceLogs, createMaintenanceLog, closeMaintenanceLog } from './actions'
import { getVehicles } from '../vehicles/actions'
import { MaintenanceLog, Vehicle, UserRole } from '@/lib/types'
import { MAINTENANCE_STATUS_COLORS } from '@/lib/constants'
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

export default function MaintenancePage() {
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<UserRole>('driver')

  // Search
  const [search, setSearch] = useState('')

  // Create Modal
  const [isOpen, setIsOpen] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [selectedVehicleId, setSelectedVehicleId] = useState('')

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
      const data = await getMaintenanceLogs()
      setLogs(data)

      const vList = await getVehicles()
      // Only show non-Retired vehicles for new maintenance logs
      setVehicles(vList.filter(v => v.status !== 'Retired'))
    } catch (e: any) {
      toast.error('Failed to load maintenance data: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const isManager = role === 'fleet_manager'

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormLoading(true)
    const formData = new FormData(e.currentTarget)

    const input = {
      vehicle_id: selectedVehicleId,
      description: formData.get('description') as string,
      cost: parseFloat(formData.get('cost') as string),
    }

    try {
      const res = await createMaintenanceLog(input)
      if (res.error) throw new Error(res.error)
      toast.success('Maintenance log created. Vehicle status changed to In Shop.')
      setIsOpen(false)
      setSelectedVehicleId('')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleClose(id: string) {
    try {
      const res = await closeMaintenanceLog(id)
      if (res.error) throw new Error(res.error)
      toast.success('Maintenance completed. Vehicle returned to Available.')
      fetchData()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  const filteredLogs = logs.filter(l =>
    l.description.toLowerCase().includes(search.toLowerCase()) ||
    (l.vehicle?.registration_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (l.vehicle?.name || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Maintenance Logs</h1>
          <p className="text-muted-foreground">Manage and track fleet vehicle service and shop logs</p>
        </div>
        {isManager && (
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-500 text-white">
                <Plus className="w-4 h-4 mr-2" /> Log Maintenance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <form onSubmit={handleCreate}>
                <DialogHeader>
                  <DialogTitle>Log Maintenance</DialogTitle>
                  <DialogDescription>
                    Provide maintenance specifications. Note: This sets the vehicle to 'In Shop' automatically.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle_id">Assigned Vehicle *</Label>
                    <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.registration_number}) — {v.status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Service Description *</Label>
                    <Input id="description" name="description" placeholder="Brake disk replace / engine service" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cost">Service Cost (₹) *</Label>
                    <Input id="cost" name="cost" type="number" placeholder="4500" required />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={formLoading || !selectedVehicleId} className="bg-blue-600 text-white">
                    {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Confirm Entry
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex gap-4 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search descriptions, vehicles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Maintenance Table */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Cost</TableHead>
                <TableHead>Date Opened</TableHead>
                <TableHead>Date Closed</TableHead>
                <TableHead>Status</TableHead>
                {isManager && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground p-8">
                    No maintenance logs found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-semibold">
                      {log.vehicle ? `${log.vehicle.name} (${log.vehicle.registration_number})` : '—'}
                    </TableCell>
                    <TableCell>{log.description}</TableCell>
                    <TableCell>₹{log.cost.toLocaleString()}</TableCell>
                    <TableCell>{new Date(log.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{log.closed_at ? new Date(log.closed_at).toLocaleDateString() : '—'}</TableCell>
                    <TableCell>
                      <Badge className={MAINTENANCE_STATUS_COLORS[log.status]}>
                        {log.status}
                      </Badge>
                    </TableCell>
                    {isManager && (
                      <TableCell className="text-right">
                        {log.status === 'Active' && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1"
                            onClick={() => handleClose(log.id)}
                          >
                            <Check className="w-3.5 h-3.5" /> Close Log
                          </Button>
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
    </div>
  )
}
