'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Loader2, DollarSign } from 'lucide-react'
import { getFuelLogs, getExpenses, createFuelLog, createExpense, getVehicleCostSummary } from './actions'
import { getVehicles } from '../vehicles/actions'
import { FuelLog, Expense, Vehicle, UserRole } from '@/lib/types'
import { EXPENSE_TYPES } from '@/lib/constants'
import { createClient } from '@/utils/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function FuelExpensesPage() {
  const [activeTab, setActiveTab] = useState('summary')
  const [loading, setLoading] = useState(true)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [role, setRole] = useState<UserRole>('driver')

  // Lists
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [costSummary, setCostSummary] = useState<any[]>([])

  // Search
  const [search, setSearch] = useState('')

  // Modals state
  const [isFuelOpen, setIsFuelOpen] = useState(false)
  const [isExpenseOpen, setIsExpenseOpen] = useState(false)
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
      const summary = await getVehicleCostSummary()
      setCostSummary(summary)

      const fList = await getFuelLogs()
      setFuelLogs(fList)

      const eList = await getExpenses()
      setExpenses(eList)

      const vList = await getVehicles()
      setVehicles(vList)
    } catch (e: any) {
      toast.error('Failed to load operational cost reports: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const isDriverOrManager = role === 'fleet_manager' || role === 'driver'
  const isManager = role === 'fleet_manager'

  async function handleFuelSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormLoading(true)
    const formData = new FormData(e.currentTarget)

    const input = {
      vehicle_id: selectedVehicleId,
      liters: parseFloat(formData.get('liters') as string),
      cost: parseFloat(formData.get('cost') as string),
      date: formData.get('date') as string,
    }

    try {
      const res = await createFuelLog(input)
      if (res.error) throw new Error(res.error)
      toast.success('Fuel purchase logged')
      setIsFuelOpen(false)
      setSelectedVehicleId('')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  async function handleExpenseSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormLoading(true)
    const formData = new FormData(e.currentTarget)

    const input = {
      vehicle_id: selectedVehicleId,
      type: formData.get('type') as string,
      amount: parseFloat(formData.get('amount') as string),
      date: formData.get('date') as string,
      notes: formData.get('notes') as string || undefined,
    }

    try {
      const res = await createExpense(input)
      if (res.error) throw new Error(res.error)
      toast.success('Other expense logged')
      setIsExpenseOpen(false)
      setSelectedVehicleId('')
      fetchData()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setFormLoading(false)
    }
  }

  // Filter cost summary list
  const filteredSummary = costSummary.filter(s =>
    s.registration_number.toLowerCase().includes(search.toLowerCase()) ||
    s.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fuel & Operational Expenses</h1>
          <p className="text-muted-foreground">Manage fuel purchases, extra costs, and fleet operations metrics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isDriverOrManager && (
            <Dialog open={isFuelOpen} onOpenChange={setIsFuelOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-500 text-white">Log Fuel Purchase</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <form onSubmit={handleFuelSubmit}>
                  <DialogHeader>
                    <DialogTitle>Log Fuel Purchase</DialogTitle>
                    <DialogDescription>
                      Provide fuel purchase details.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_id">Vehicle *</Label>
                      <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name} ({v.registration_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="liters">Liters *</Label>
                        <Input id="liters" name="liters" type="number" step="0.01" placeholder="45.0" required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cost">Total Cost (₹) *</Label>
                        <Input id="cost" name="cost" type="number" step="0.01" placeholder="4500" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Purchase Date *</Label>
                      <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={formLoading || !selectedVehicleId} className="bg-blue-600 text-white">
                      {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Log
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}

          {isManager && (
            <Dialog open={isExpenseOpen} onOpenChange={setIsExpenseOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-blue-600 text-blue-500 hover:bg-blue-500/10">Log Other Expense</Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px]">
                <form onSubmit={handleExpenseSubmit}>
                  <DialogHeader>
                    <DialogTitle>Log Other Expense</DialogTitle>
                    <DialogDescription>
                      Provide general operational expense logs.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="vehicle_id">Vehicle *</Label>
                      <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vehicle" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicles.map(v => (
                            <SelectItem key={v.id} value={v.id}>
                              {v.name} ({v.registration_number})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Expense Type *</Label>
                        <Select name="type" defaultValue={EXPENSE_TYPES[0]}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {EXPENSE_TYPES.map(t => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount (₹) *</Label>
                        <Input id="amount" name="amount" type="number" step="0.01" placeholder="1200" required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Date *</Label>
                      <Input id="date" name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="notes">Notes / Details</Label>
                      <Input id="notes" name="notes" placeholder="Mumbai expressway tolls" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={formLoading || !selectedVehicleId} className="bg-blue-600 text-white">
                      {formLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Log
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 max-w-md">
          <TabsTrigger value="summary">Fleet TCO Summary</TabsTrigger>
          <TabsTrigger value="fuel">Fuel Records</TabsTrigger>
          <TabsTrigger value="expenses">Other Expenses</TabsTrigger>
        </TabsList>

        {/* Tab 1: Operational Cost Summary */}
        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Fleet Total Cost of Ownership (TCO)</CardTitle>
              <CardDescription>
                Summary of fuel costs, maintenance, and extra expenses calculated per vehicle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Fuel Expenses</TableHead>
                      <TableHead>Maintenance Expenses</TableHead>
                      <TableHead>Other Expenses</TableHead>
                      <TableHead className="font-bold">Total Operational Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSummary.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground p-8">
                          No fleet data found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSummary.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="font-semibold">
                            {s.name} ({s.registration_number})
                          </TableCell>
                          <TableCell>₹{s.totalFuelCost.toLocaleString()}</TableCell>
                          <TableCell>₹{s.totalMaintCost.toLocaleString()}</TableCell>
                          <TableCell>₹{s.totalOtherCost.toLocaleString()}</TableCell>
                          <TableCell className="font-bold text-blue-500">
                            ₹{s.totalOperationalCost.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Fuel Logs */}
        <TabsContent value="fuel">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Fuel Liters</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Rate per Liter</TableHead>
                    <TableHead>Date Logged</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fuelLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground p-8">
                        No fuel purchases recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    fuelLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-semibold">
                          {log.vehicle ? `${log.vehicle.name} (${log.vehicle.registration_number})` : '—'}
                        </TableCell>
                        <TableCell>{log.liters} L</TableCell>
                        <TableCell>₹{log.cost.toLocaleString()}</TableCell>
                        <TableCell>₹{(log.cost / log.liters).toFixed(2)}/L</TableCell>
                        <TableCell>{new Date(log.date).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Other Expenses */}
        <TabsContent value="expenses">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vehicle</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Date Logged</TableHead>
                    <TableHead>Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground p-8">
                        No extra expenses recorded.
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-semibold">
                          {exp.vehicle ? `${exp.vehicle.name} (${exp.vehicle.registration_number})` : '—'}
                        </TableCell>
                        <TableCell>{exp.type}</TableCell>
                        <TableCell>₹{exp.amount.toLocaleString()}</TableCell>
                        <TableCell>{new Date(exp.date).toLocaleDateString()}</TableCell>
                        <TableCell>{exp.notes || '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
