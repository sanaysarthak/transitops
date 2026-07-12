'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateMaintenanceInput, MaintenanceLog } from '@/lib/types'

export async function getMaintenanceLogs() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('maintenance_logs')
    .select(`
      *,
      vehicle:vehicles(*)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as MaintenanceLog[]
}

export async function createMaintenanceLog(input: CreateMaintenanceInput) {
  const supabase = await createClient()

  // Rule 9: Triggers set vehicle.status = In Shop automatically in the database
  const { data, error } = await supabase
    .from('maintenance_logs')
    .insert([
      {
        ...input,
        status: 'Active',
      }
    ])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/maintenance')
  revalidatePath('/dashboard/vehicles')
  return { data: data as MaintenanceLog }
}

export async function closeMaintenanceLog(id: string) {
  const supabase = await createClient()

  // Rule 10: Triggers restore vehicle status to Available (unless Retired)
  const { data, error } = await supabase
    .from('maintenance_logs')
    .update({
      status: 'Closed',
      closed_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/maintenance')
  revalidatePath('/dashboard/vehicles')
  return { data: data as MaintenanceLog }
}
