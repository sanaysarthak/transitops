'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Download, Loader2, Printer } from 'lucide-react'
import { getFuelEfficiency, getOperationalCosts, getVehicleROI } from './actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981']

export default function ReportsPage() {
  const [loading, setLoading] = useState(true)
  const [fuelEff, setFuelEff] = useState<any[]>([])
  const [costs, setCosts] = useState<any[]>([])
  const [roiData, setRoiData] = useState<any[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        const eff = await getFuelEfficiency()
        setFuelEff(eff)

        const costData = await getOperationalCosts()
        setCosts(costData)

        const roi = await getVehicleROI()
        setRoiData(roi)
      } catch (e: any) {
        toast.error('Failed to load reports: ' + e.message)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // CSV Export utility
  function exportToCSV(data: any[], filename: string) {
    if (data.length === 0) {
      toast.error('No data available to export')
      return
    }

    const headers = Object.keys(data[0])
    const csvRows = [
      headers.join(','), // header row
      ...data.map(row =>
        headers.map(fieldName => JSON.stringify(row[fieldName] || '')).join(',')
      )
    ]

    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `${filename}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`${filename}.csv exported successfully!`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Reports & Fleet Analytics</h1>
          <p className="text-muted-foreground">Monitor performance indicators, operational costs, and investment returns.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.print()}
          className="print:hidden w-fit shadow-xs gap-2"
        >
          <Printer className="w-4 h-4" /> Print Report / PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fuel Efficiency Bar Chart */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Fuel Efficiency</CardTitle>
              <CardDescription>Actual Kilometers completed per Liter of fuel consumed</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(fuelEff, 'fuel_efficiency')}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </CardHeader>
          <CardContent className="h-[300px]">
            {fuelEff.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">No completed trips logs.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fuelEff}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={11} tickLine={false} axisLine={false} unit=" km/L" />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
                  <Bar dataKey="efficiency" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Operational Cost Breakdown Chart */}
        <Card className="flex flex-col">
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Operational Cost Breakdown</CardTitle>
              <CardDescription>Visual comparison of fuel, maintenance, and other expenses</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => exportToCSV(costs, 'cost_breakdown')}>
              <Download className="w-4 h-4 mr-2" /> Export
            </Button>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            {costs.reduce((acc, curr) => acc + curr.value, 0) === 0 ? (
              <div className="text-muted-foreground">No operational expense logs recorded.</div>
            ) : (
              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around">
                <div className="w-[200px] h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={costs}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {costs.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2 mt-4 sm:mt-0">
                  {costs.map((entry, index) => (
                    <div key={entry.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                      <span className="text-sm font-medium">{entry.name}:</span>
                      <span className="text-sm text-muted-foreground">₹{entry.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle ROI Reports */}
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Fleet Investment Return (ROI)</CardTitle>
            <CardDescription>
              ROI = (Revenue - (Maintenance + Fuel)) / Acquisition Cost
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => exportToCSV(roiData, 'fleet_roi')}>
            <Download className="w-4 h-4 mr-2" /> Export ROI Report
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Total Revenue</TableHead>
                <TableHead>Fuel Expenses</TableHead>
                <TableHead>Maintenance Expenses</TableHead>
                <TableHead>Acquisition Cost</TableHead>
                <TableHead>Net Profit</TableHead>
                <TableHead className="font-bold">Return on Investment (ROI)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roiData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground p-8">
                    No active vehicles to analyze.
                  </TableCell>
                </TableRow>
              ) : (
                roiData.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="font-semibold">{v.name} ({v.registration})</TableCell>
                    <TableCell>₹{v.revenue.toLocaleString()}</TableCell>
                    <TableCell>₹{v.fuelCost.toLocaleString()}</TableCell>
                    <TableCell>₹{v.maintCost.toLocaleString()}</TableCell>
                    <TableCell>₹{v.acquisitionCost.toLocaleString()}</TableCell>
                    <TableCell className={v.netIncome >= 0 ? 'text-emerald-500' : 'text-red-500'}>
                      ₹{v.netIncome.toLocaleString()}
                    </TableCell>
                    <TableCell className={`font-bold ${v.roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                      {v.roi}%
                    </TableCell>
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
