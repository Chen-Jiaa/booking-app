'use server'

import { db } from "@/db";
import { bookings } from "@/db/schema";
import { updateCalendarEvent } from "@/lib/google-calendar";
import { sendBookingConfirmationEmail, sendBookingRejectionEmail } from "@/lib/sendBookingEmail";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateBookingStatus(
  bookingId: number, 
  newStatus: 'confirmed' | 'pending' | 'rejected'
) {
  try {
    await db.transaction(async(tx) => {
      const result = await tx
        .update(bookings)
        .set({ status: newStatus })
        .where(eq(bookings.id, bookingId))
        .returning();

      const updatedBooking = result[0] as typeof result[0] | undefined

      if (!updatedBooking) {
        throw new Error(`Booking with ID ${bookingId.toString()} not found.`);
      }

      await Promise.all([
        updateCalendarEvent(updatedBooking),

        (async () => {
          if (!updatedBooking.email) {
            console.warn(`Booking ID ${updatedBooking.id.toString()} was updated to "${newStatus}", but no email is on file.`);
            return;
          }
          if (newStatus === 'confirmed') {
            await sendBookingConfirmationEmail({
              ...updatedBooking,
              to: updatedBooking.email,
            });
          } else if (newStatus === 'rejected') {
            await sendBookingRejectionEmail({
              ...updatedBooking,
              to: updatedBooking.email
            })
          }
        })()
      ]);
    });
    // Revalidate the page to show updated data
    revalidatePath('/admin/bookings'); // Update this to your actual path
    
    return { success: true };

  } catch (error) {
    console.error('Failed to update booking status:', error);

    return { error: 'Failed to update booking status', success: false };
  }
}