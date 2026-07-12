'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateVehicleInput, Vehicle, VehicleStatus } from '@/lib/types'

export async function getVehicles(filters?: { type?: string; status?: VehicleStatus; region?: string }) {
  const supabase = await createClient()
  let query = supabase.from('vehicles').select('*').order('created_at', { ascending: false })

  if (filters?.type && filters.type !== 'all') {
    query = query.eq('type', filters.type)
  }
  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }
  if (filters?.region && filters.region !== 'all') {
    query = query.eq('region', filters.region)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Vehicle[]
}

export async function createVehicle(input: CreateVehicleInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicles')
    .insert([input])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/vehicles')
  return { data: data as Vehicle }
}

export async function updateVehicle(id: string, input: Partial<CreateVehicleInput>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('vehicles')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/vehicles')
  return { data: data as Vehicle }
}

export async function deleteVehicle(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('vehicles')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/vehicles')
  return { success: true }
}
