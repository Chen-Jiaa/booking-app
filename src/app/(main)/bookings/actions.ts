'use server'

import { createClient } from "@/lib/supabase/server"
import { Bookings } from "@/types/booking"


export async function cancelUserBooking(id:string): Promise<void> {
    const supabase = await createClient()
    const {error} = await supabase
    .from("bookings")
    .delete()
    .eq('id', id)

    if(error) {
      console.log('Error cancelling booking:', error.message)
      throw new Error('Failed to cancel booking')
    }
}

export async function fetchUserBookings(userId: string): Promise<Bookings[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Error loading bookings", error)
    return []
  }
  
  const sortedBookings = [...data as Bookings[]].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )

  return sortedBookings
}