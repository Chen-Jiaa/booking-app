'use server'

import { db } from "@/db";
import { bookings } from "@/db/schema";
import { addMinutes, format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { and, eq, gte, inArray, lt } from "drizzle-orm";

export async function getUnavailableSlots(
    roomId: string, selectedDate: Date, timezone = 'Asia/Kuala_Lumpur'
): Promise<Set<string>> {
  try {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    
    const dayStartUTC = new Date(`${String(year)}-${month}-${day}T00:00:00+08:00`);
    const dayEndUTC = new Date(`${String(year)}-${month}-${day}T23:59:59+08:00`);

    console.log('Query range:', {
        dayEndUTC: dayEndUTC.toISOString(),
        dayStartUTC: dayStartUTC.toISOString(),
        selectedDate: `${String(year)}-${month}-${day}`,
    });

    const existingBookings = await db
        .select({
            endTime: bookings.endTime,
            startTime: bookings.startTime
        })
        .from(bookings)
        .where(
            and(
                eq(bookings.roomId, roomId),
                inArray(bookings.status, ["pending", "confirmed"]),
                gte(bookings.startTime, dayStartUTC),
                lt(bookings.startTime, dayEndUTC)
            )
        )
    
    console.log('Found bookings:', existingBookings.map(b => ({
        end: b.endTime.toISOString(),
        start: b.startTime.toISOString()
    })));

    const booked = new Set<string>()
    if (existingBookings.length > 0) {
        for (const booking of existingBookings) {
            let currentSlot = toZonedTime(booking.startTime, timezone);
            const endTimeLocal = toZonedTime(booking.endTime, timezone);

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