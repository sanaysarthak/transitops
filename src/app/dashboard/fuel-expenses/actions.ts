'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateFuelLogInput, CreateExpenseInput, FuelLog, Expense } from '@/lib/types'

export async function getFuelLogs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fuel_logs')
    .select(`
      *,
      vehicle:vehicles(*)
    `)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data as FuelLog[]
}

export async function getExpenses() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .select(`
      *,
      vehicle:vehicles(*)
    `)
    .order('date', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Expense[]
}

export async function createFuelLog(input: CreateFuelLogInput) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert([input])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/fuel-expenses')
  return { data: data as FuelLog }
}

export async function createExpense(input: CreateExpenseInput) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('expenses')
    .insert([input])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/fuel-expenses')
  return { data: data as Expense }
}

export async function getVehicleCostSummary() {
  const supabase = await createClient()
  
  // Get all vehicles
  const { data: vehicles } = await supabase.from('vehicles').select('id, registration_number, name')
  if (!vehicles) return []

  const summary = await Promise.all(
    vehicles.map(async (v) => {
      // Fuel cost total
      const { data: fuel } = await supabase
        .from('fuel_logs')
        .select('cost')
        .eq('vehicle_id', v.id)
      const totalFuelCost = (fuel || []).reduce((acc, f) => acc + Number(f.cost), 0)

      // Maintenance cost total
      const { data: maintenance } = await supabase
        .from('maintenance_logs')
        .select('cost')
        .eq('vehicle_id', v.id)
      const totalMaintCost = (maintenance || []).reduce((acc, m) => acc + Number(m.cost), 0)

      // Other expenses total
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('vehicle_id', v.id)
      const totalOtherCost = (expenses || []).reduce((acc, e) => acc + Number(e.amount), 0)

      return {
        id: v.id,
        registration_number: v.registration_number,
        name: v.name,
        totalFuelCost,
        totalMaintCost,
        totalOtherCost,
        totalOperationalCost: totalFuelCost + totalMaintCost + totalOtherCost,
      }
    })
  )

  return summary
}
