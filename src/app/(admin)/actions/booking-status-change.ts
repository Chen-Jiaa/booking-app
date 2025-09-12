'use server'

import { createCalendarEvent, updateCalendarEvent } from "@/lib/google-calendar";
import { sendBookingConfirmationEmail, sendBookingRejectionEmail } from "@/lib/sendBookingEmail";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Corrected Bookings interface to match the camelCase Drizzle schema
export interface Bookings {
    createdAt: Date;
    email: string;
    endTime: Date;
    eventId: null | string;
    id: number;
    name: string;
    phone: string;
    purpose: string;
    roomId: null | string;
    roomName: string;
    startTime: Date;
    status: string;
    userId: null | string;
}

// A new type that mirrors the camelCase needed for Google Calendar
interface CalendarEventBooking {
  createdAt: Date;
  email: string;
  endTime: Date;
  eventId: null | string;
  id: number;
  name: string;
  phone: string;
  purpose: string;
  roomId: null | string;
  roomName: string;
  startTime: Date;
  status: string;
  userId: null | string;
}

// Interface to match the raw snake_case data returned by Supabase
interface SupabaseBooking {
    created_at: string;
    email: string;
    end_time: string;
    event_id: null | string;
    id: number;
    name: string;
    phone: string;
    purpose: string;
    room_id: null | string;
    room_name: string;
    start_time: string;
    status: string;
    user_id: null | string;
}

export async function updateBookingStatus(
  bookingId: number,
  newStatus: 'confirmed' | 'pending' | 'rejected'
) {
  try {
    const supabase = await createClient();

    const { data: result, error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId)
        .select()
        .single<SupabaseBooking>();

    if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message);
    }

    const supabaseBooking = result as null | SupabaseBooking;

    if (!supabaseBooking) {
      throw new Error(`Booking with ID ${bookingId.toString()} not found.`);
    }

    // Map the snake_case data from Supabase to the camelCase Bookings interface
    const updatedBooking: Bookings = {
        createdAt: new Date(supabaseBooking.created_at),
        email: supabaseBooking.email,
        endTime: new Date(supabaseBooking.end_time),
        eventId: supabaseBooking.event_id,
        id: supabaseBooking.id,
        name: supabaseBooking.name,
        phone: supabaseBooking.phone,
        purpose: supabaseBooking.purpose,
        roomId: supabaseBooking.room_id,
        roomName: supabaseBooking.room_name,
        startTime: new Date(supabaseBooking.start_time),
        status: supabaseBooking.status,
        userId: supabaseBooking.user_id,
    };
    
    // Now pass the correctly-typed camelCase object to the calendar function
    const bookingForCalendar: CalendarEventBooking = {
        createdAt: updatedBooking.createdAt,
        email: updatedBooking.email,
        endTime: updatedBooking.endTime,
        eventId: updatedBooking.eventId,
        id: updatedBooking.id,
        name: updatedBooking.name,
        phone: updatedBooking.phone,
        purpose: updatedBooking.purpose,
        roomId: updatedBooking.roomId,
        roomName: updatedBooking.roomName,
        startTime: updatedBooking.startTime,
        status: updatedBooking.status,
        userId: updatedBooking.userId,
    };
    
    // Call updateCalendarEvent with the correctly typed object
    if (newStatus === 'confirmed') {
        const eventId = await createCalendarEvent(bookingForCalendar);
        await supabase
            .from("bookings")
            .update({ eventId })
            .eq("id", bookingId);
    } else {
        await updateCalendarEvent(bookingForCalendar);
    }

    await (async () => {
        if (!updatedBooking.email) {
          console.warn(`Booking ID ${updatedBooking.id.toString()} was updated to "${newStatus}", but no email is on file.`);
          return;
        }

        if (newStatus === 'confirmed') {
          // Pass the original updatedBooking object, which now correctly matches the SendEmailProps type
          await sendBookingConfirmationEmail({ ...updatedBooking, to: updatedBooking.email });
        } else if (newStatus === 'rejected') {
          await sendBookingRejectionEmail({ ...updatedBooking, to: updatedBooking.email });
        }
      })();
    revalidatePath('/admin/bookings');
    return { success: true };

  } catch (error) {
    console.error('Failed to update booking status:', error);
    return { error: 'Failed to update booking status', success: false };
  }
}
