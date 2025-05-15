"use server"

import { sendBookingEmail } from "@/lib/sendBookingEmail";
import { createClient } from "@/lib/supabase/server";
import { Bookings } from "@/types/booking";
import { z } from "zod";

import { syncToCalendar } from "../../lib/sync-calendar";

const formSchema = z.object({
    email: z.string().email(),
    fullEndTime: z.string(),
    fullStartTime: z.string(),
    name: z.string().min(2),
    phone: z.string().min(7),
    purpose: z.string().min(1),
    selectedRoomId: z.string(),
    selectedRoomName: z.string(),
    userId: z.string().optional(),
  })
  
export async function submitBooking(values: z.infer<typeof formSchema>) {
    formSchema.parse(values)

    const supabase = await createClient()
    
    const {
        email,
        fullEndTime,
        fullStartTime,
        name,
        phone,
        purpose,
        selectedRoomId,
        selectedRoomName,
        userId,
      } = values
    

    const {data, error} : {
      data: Bookings | null,
      error: Error | null
    } = await supabase
        .from("bookings")
        .insert([
            {
                email,
                end_time: fullEndTime,
                name,
                phone,
                purpose,
                room_id: selectedRoomId,
                room_name: selectedRoomName,
                start_time: fullStartTime,
                status: "pending",
                user_id: userId ?? null,
            }
        ])
        .select()
        .single()

    if (error) throw new Error(error.message)

    if (!data) {
      throw new Error("Booking data is null after insert.");
    }

    const booking = data
    
    await syncToCalendar({
      bookingId: booking.id,
      email: values.email,
      fullEndTime,
      fullStartTime,
      name: values.name,
      phone: values.phone,
      purpose: values.purpose,
      selectedRoomName,
    })
    
    await sendBookingEmail({
      bookingId: booking.id,
      email: values.email,
      fullEndTime,
      fullStartTime,
      name,
      phone: values.phone,
      purpose,
      selectedRoomName,
      to: 'eongchenjia@gmail.com'
    })
    return booking
    
}