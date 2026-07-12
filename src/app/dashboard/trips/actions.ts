'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { CreateTripInput, CompleteTripInput, Trip, Vehicle, Driver } from '@/lib/types'

// Get all trips
export async function getTrips() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('trips')
    .select(`
      *,
      vehicle:vehicles(*),
      driver:drivers(*)
    `)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data as Trip[]
}

// Get valid vehicles for trip creation (Rule 2: Not Retired or In Shop, Rule 4: Not On Trip)
export async function getValidVehicles() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('status', 'Available')

  if (error) throw new Error(error.message)
  return data as Vehicle[]
}

// Get valid drivers for trip creation (Rule 3: Not Suspended, License Valid, Rule 4: Not On Trip)
export async function getValidDrivers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('status', 'Available')
    .gte('license_expiry_date', new Date().toISOString().split('T')[0])

  if (error) throw new Error(error.message)
  return data as Driver[]
}

// Create a trip (Draft status by default)
export async function createTrip(input: CreateTripInput) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trips')
    .insert([
      {
        ...input,
        status: 'Draft',
      }
    ])
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/trips')
  return { data: data as Trip }
}

// Dispatch a trip (Draft -> Dispatched)
// Rule 6: Sets vehicle.status = On Trip and driver.status = On Trip (via trigger)
export async function dispatchTrip(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trips')
    .update({ status: 'Dispatched' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/trips')
  return { data: data as Trip }
}

// Complete a trip (Dispatched -> Completed)
// Rule 7: Sets vehicle.status = Available and driver.status = Available (via trigger)
export async function completeTrip(id: string, input: CompleteTripInput) {
  const supabase = await createClient()

  // We need to fetch the trip first to get the vehicle_id and update its odometer
  const { data: trip, error: fetchError } = await supabase
    .from('trips')
    .select('vehicle_id')
    .eq('id', id)
    .single()

  if (fetchError) return { error: fetchError.message }

  // Start Transactional Update:
  // 1. Update trip stats and mark as Completed
  const { data, error } = await supabase
    .from('trips')
    .update({
      status: 'Completed',
      actual_distance: input.actual_distance,
      fuel_consumed: input.fuel_consumed,
      revenue: input.revenue || 0,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  // 2. Increment vehicle odometer by actual distance completed
  if (trip && input.actual_distance > 0) {
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('odometer')
      .eq('id', trip.vehicle_id)
      .single()

    if (vehicle) {
      const newOdometer = Number(vehicle.odometer) + Number(input.actual_distance)
      await supabase
        .from('vehicles')
        .update({ odometer: newOdometer })
        .eq('id', trip.vehicle_id)
    }
  }

  revalidatePath('/dashboard/trips')
  revalidatePath('/dashboard/vehicles')
  return { data: data as Trip }
}

// Cancel a trip (Dispatched -> Cancelled)
// Rule 8: Restores statuses (via trigger)
export async function cancelTrip(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('trips')
    .update({ status: 'Cancelled' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/trips')
  return { data: data as Trip }
}
