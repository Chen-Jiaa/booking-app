"use server";

import { db } from "@/db";
import { bookingDays, bookings } from "@/db/schema";
import { deleteCalendarEvent, updateCalendarEvent } from "@/lib/google-calendar";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function cancelUserBooking(id: number): Promise<void> {
  try {
    const cancelledBooking = await db.transaction(async (tx) => {
      const result = await tx
        .update(bookings)
        .set({ status: "cancelled" })
        .where(eq(bookings.id, id))
        .returning();

      const updatedBooking = result[0] as (typeof result)[0] | undefined;

      if (!updatedBooking) {
        throw new Error("Failed to cancel booking: Booking not found.");
      }

      if (updatedBooking.isMultiDay) {
        // Cancel linked bookings (e.g., lobby booking with parentBookingId)
        const linkedBookings = await tx
          .select()
          .from(bookings)
          .where(eq(bookings.parentBookingId, id));

        for (const linked of linkedBookings) {
          await tx.update(bookings).set({ status: "cancelled" }).where(eq(bookings.id, linked.id));
        }
      } else {
        // Standard booking — delete calendar event inside transaction (existing pattern)
        await updateCalendarEvent(updatedBooking);
      }

      return updatedBooking;
    });

    // For multi-day bookings, delete calendar events outside transaction
    if (cancelledBooking.isMultiDay) {
      // Delete main booking's day calendar events
      const mainDays = await db.select().from(bookingDays).where(eq(bookingDays.bookingId, id));

      for (const day of mainDays) {
        if (day.eventId) {
          try {
            await deleteCalendarEvent(day.eventId);
          } catch (error) {
            console.error(`Failed to delete calendar event for day ${day.id}:`, error);
          }
        }
      }

      // Delete linked bookings' day calendar events
      const linkedBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.parentBookingId, id));

      for (const linked of linkedBookings) {
        const linkedDays = await db
          .select()
          .from(bookingDays)
          .where(eq(bookingDays.bookingId, linked.id));

        for (const day of linkedDays) {
          if (day.eventId) {
            try {
              await deleteCalendarEvent(day.eventId);
            } catch (error) {
              console.error(`Failed to delete lobby calendar event for day ${day.id}:`, error);
            }
          }
        }
      }
    }

    revalidatePath("/bookings");
  } catch (error) {
    console.error("Error in cancelUserBooking:", error);
    // Re-throw the error so the client-side code knows the operation failed.
    throw new Error("Failed to cancel the booking.", { cause: error });
  }
}
