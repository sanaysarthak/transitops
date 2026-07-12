'use server'

import { createClient } from '@/utils/supabase/server'

// Get Fuel Efficiency: actual_distance / fuel_consumed per vehicle
export async function getFuelEfficiency() {
  const supabase = await createClient()

  // Get completed trips with distance & fuel consumed
  const { data: trips } = await supabase
    .from('trips')
    .select(`
      actual_distance,
      fuel_consumed,
      vehicle:vehicles(registration_number, name)
    `)
    .eq('status', 'Completed')

  if (!trips) return []

  const stats: Record<string, { name: string; distance: number; fuel: number }> = {}

  trips.forEach((t: any) => {
    if (!t.vehicle) return
    const reg = t.vehicle.registration_number
    if (!stats[reg]) {
      stats[reg] = {
        name: `${t.vehicle.name} (${reg})`,
        distance: 0,
        fuel: 0,
      }
    }
    stats[reg].distance += Number(t.actual_distance || 0)
    stats[reg].fuel += Number(t.fuel_consumed || 0)
  })

  // Format for Recharts bar chart
  return Object.values(stats)
    .map(s => ({
      name: s.name,
      efficiency: s.fuel > 0 ? Number((s.distance / s.fuel).toFixed(2)) : 0,
    }))
    .filter(s => s.efficiency > 0)
}

// Get Fleet Utilization
export async function getFleetUtilization() {
  const supabase = await createClient()

  // Get total active vehicles count
  const { count: totalVehicles } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'Retired')

  // Get vehicles currently on trip
  const { count: onTripVehicles } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'On Trip')

  const total = totalVehicles || 0
  const onTrip = onTripVehicles || 0

  const rate = total > 0 ? Math.round((onTrip / total) * 100) : 0

  return {
    total,
    onTrip,
    utilizationRate: rate,
  }
}

// Get Operational Cost breakdown for Pie charts
export async function getOperationalCosts() {
  const supabase = await createClient()

  // Total Fuel
  const { data: fuel } = await supabase.from('fuel_logs').select('cost')
  const totalFuel = (fuel || []).reduce((acc, f) => acc + Number(f.cost), 0)

  // Total Maintenance
  const { data: maint } = await supabase.from('maintenance_logs').select('cost')
  const totalMaint = (maint || []).reduce((acc, m) => acc + Number(m.cost), 0)

  // Total Expenses
  const { data: exp } = await supabase.from('expenses').select('amount')
  const totalExp = (exp || []).reduce((acc, e) => acc + Number(e.amount), 0)

  return [
    { name: 'Fuel', value: totalFuel },
    { name: 'Maintenance', value: totalMaint },
    { name: 'Other Expenses', value: totalExp },
  ]
}

// Get Vehicle ROI: (Revenue - (Maintenance + Fuel)) / Acquisition Cost
export async function getVehicleROI() {
  const supabase = await createClient()

  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('id, registration_number, name, acquisition_cost')
    .neq('status', 'Retired')

  if (!vehicles) return []

  const roiList = await Promise.all(
    vehicles.map(async (v) => {
      // Completed Trip revenues
      const { data: trips } = await supabase
        .from('trips')
        .select('revenue')
        .eq('vehicle_id', v.id)
        .eq('status', 'Completed')
      const revenue = (trips || []).reduce((acc, t) => acc + Number(t.revenue || 0), 0)

      // Fuel log costs
      const { data: fuel } = await supabase
        .from('fuel_logs')
        .select('cost')
        .eq('vehicle_id', v.id)
      const fuelCost = (fuel || []).reduce((acc, f) => acc + Number(f.cost), 0)

      // Maintenance costs
      const { data: maint } = await supabase
        .from('maintenance_logs')
        .select('cost')
        .eq('vehicle_id', v.id)
      const maintCost = (maint || []).reduce((acc, m) => acc + Number(m.cost), 0)

      const netIncome = revenue - (fuelCost + maintCost)
      const acqCost = Number(v.acquisition_cost)

      // ROI % = (Net Income / Acquisition Cost) * 100
      const roiPercent = acqCost > 0 ? Number(((netIncome / acqCost) * 100).toFixed(2)) : 0

      return {
        id: v.id,
        name: v.name,
        registration: v.registration_number,
        revenue,
        fuelCost,
        maintCost,
        acquisitionCost: acqCost,
        netIncome,
        roi: roiPercent,
      }
    })
  )

  // Sort by highest ROI first
  return roiList.sort((a, b) => b.roi - a.roi)
}
