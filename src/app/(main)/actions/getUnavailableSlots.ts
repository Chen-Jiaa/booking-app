'use server'

import { createClient } from "@/lib/supabase/server";
import { addMinutes, format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface BookingType {
  end_time: string;
  start_time: string;
}

export async function getUnavailableSlots(
    roomId: string, selectedDate: Date, timezone = 'Asia/Kuala_Lumpur'
): Promise<Set<string>> {

    try {
        const startOfDayLocal = toZonedTime(selectedDate, timezone);
        startOfDayLocal.setHours(0, 0, 0, 0);

        const endOfDayLocal = toZonedTime(selectedDate, timezone);
        endOfDayLocal.setHours(23, 59, 59, 999);
        
        const dayStartISO = startOfDayLocal.toISOString();
        const dayEndISO = endOfDayLocal.toISOString();

        const supabase = await createClient()

        const { data: existingBookings } = await supabase
          .from("bookings")
          .select<string, BookingType>("start_time, end_time")
          .eq("room_id", roomId)
          .in("status", ["pending", "confirmed"])
          .gte("start_time", dayStartISO)
          .lt("start_time", dayEndISO)

        const booked = new Set<string>()
        if (existingBookings && existingBookings.length > 0) {
            for (const booking of existingBookings) {
                let currentSlot = toZonedTime(parseISO(booking.start_time), timezone);
                const endTimeLocal = toZonedTime(parseISO(booking.end_time), timezone);

                while (currentSlot < endTimeLocal) {
                    const timeStr = format(currentSlot, "HH:mm");
                    booked.add(timeStr);
                    currentSlot = addMinutes(currentSlot, 30);
                }
            }
        }

        console.log('Booked slots:', [...booked]);


        return booked;

    } catch (error) {
        console.error("Error fetching unavailable slots:", error);
        return new Set<string>();
    }
}