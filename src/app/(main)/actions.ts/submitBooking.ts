"use server"

import { sendBookingConfirmationEmail, sendBookingEmail } from "@/lib/sendBookingEmail";
import { createClient } from "@/lib/supabase/server";
import { syncToCalendar } from "@/lib/sync-calendar";
import { Bookings } from "@/types/booking";
import { z } from "zod";

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

      const { data: room, error: roomError } = await supabase
        .from("rooms")
        .select("approval_required, approvers")
        .eq("id", selectedRoomId)
        .single()

      if (roomError) throw new Error("Failed to fetch room data: " + roomError.message)

      const approvalRequired = room.approval_required === true
      const approvers: string[] = room.approvers as string[]

      const status = approvalRequired ? "pending" : "confirmed"
    
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
                status,
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
      
      await (approvalRequired && approvers.length > 0 ? Promise.all(approvers.map((approverEmail) =>
          sendBookingEmail({
            bookingId: booking.id,
            email: values.email,
            fullEndTime,
            fullStartTime,
            name,
            phone: values.phone,
            purpose,
            selectedRoomName,
            to: approverEmail,
          })
        )) : sendBookingConfirmationEmail({
          bookingId: booking.id,
          email,
          fullEndTime,
          fullStartTime,
          name,
          phone,
          purpose,
          selectedRoomName,
          to: email,
        }));
        
      return booking
    
}