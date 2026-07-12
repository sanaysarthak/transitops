'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateDriverInput, Driver, DriverStatus } from '@/lib/types'

export async function getDrivers(filters?: { status?: DriverStatus }) {
  const supabase = await createClient()
  let query = supabase.from('drivers').select('*').order('name', { ascending: true })

  if (filters?.status && filters.status !== 'all') {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as Driver[]
}

export async function createDriver(input: CreateDriverInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('drivers')
    .insert([input])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/drivers')
  return { data: data as Driver }
}

export async function updateDriver(id: string, input: Partial<CreateDriverInput>) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('drivers')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/drivers')
  return { data: data as Driver }
}

export async function deleteDriver(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/drivers')
  return { success: true }
}
