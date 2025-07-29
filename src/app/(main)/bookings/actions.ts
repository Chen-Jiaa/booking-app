'use server'

import { db } from "@/db"
import { bookings } from "@/db/schema"
import { updateCalendarEvent } from "@/lib/google-calendar"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

export async function cancelUserBooking(id:number): Promise<void> {

  try {
    await db.transaction(async (tx) => {
      const result = await tx
        .update(bookings)
        .set({status: "cancelled"})
        .where(eq(bookings.id, id))
        .returning();

      const cancelledBooking = result[0] as typeof result[0] | undefined

      if (!cancelledBooking) {
        throw new Error("Failed to cancel booking: Booking not found.");
      }

      await updateCalendarEvent(cancelledBooking)
    });

    revalidatePath("/bookings")
  } catch (error) {
    console.error("Error in cancelUserBooking:", error);
    // Re-throw the error so the client-side code knows the operation failed.
    throw new Error("Failed to cancel the booking.");
  }
}