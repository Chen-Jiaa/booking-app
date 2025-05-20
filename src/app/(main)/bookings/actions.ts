'use server'

import { createClient } from "@/lib/supabase/server"
import { Bookings } from "@/types/booking"


export async function cancelUserBooking(id:string): Promise<void> {
    const supabase = await createClient()

    const {error} = await supabase
    .from("bookings")
    .update({status: "cancelled"})
    .eq('id', id)

    if(error) {
      console.log('Error cancelling booking:', error.message)
      throw new Error('Failed to cancel booking')
    }

    const {data: bookingData, error: fetchError} = await supabase
      .from("bookings")
      .select("event_id, name, room_name, purpose")
      .eq("id", id)
      .single<Bookings>()

      
      if (fetchError || !bookingData.event_id) {
        console.log("Error fetching cancelled booking details:", fetchError?.message)
        return
      }

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL

      await fetch(`${String(baseUrl)}/api/update-calendar-event`, {
        body: JSON.stringify({
          eventId: bookingData.event_id,
          name: bookingData.name,
          newStatus: "cancelled",
          purpose: bookingData.purpose,
          room_name: bookingData.room_name,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
    })
}

export async function fetchUserBookings(userId: string): Promise<Bookings[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "cancelled")

  if (error) {
    console.error("Error loading bookings", error)
    return []
  }
  
  const sortedBookings = [...data as Bookings[]].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
  )

  return sortedBookings
}