'use server'

import { db } from "@/db";
import { bookings } from "@/db/schema";
import { addMinutes, endOfDay, format, startOfDay } from "date-fns";
import { and, eq, gte, inArray, lt } from "drizzle-orm";

export async function getUnavailableSlots(
    roomId: string, selectedDate: Date
): Promise<Set<string>> {
  try {
    const dayStart = startOfDay(selectedDate);
    const dayEnd = endOfDay(selectedDate);

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
                gte(bookings.startTime, dayStart),
                lt(bookings.startTime, dayEnd)
            )
        )
    
    const booked = new Set<string>()
    if (existingBookings.length > 0) {
        for (const booking of existingBookings) {
            let currentSlot = booking.startTime;

            while (currentSlot < booking.endTime) {
                const timeStr = format(currentSlot, "HH:mm");
                booked.add(timeStr);
                currentSlot = addMinutes(currentSlot, 30);
            }
        }
    }

    return booked;

  } catch (error) {
    console.error("Error fetching unavailable slots:", error);
    return new Set<string>();
  }
}
