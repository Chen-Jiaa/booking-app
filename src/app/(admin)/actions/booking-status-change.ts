'use server'

import { db } from "@/db";
import { bookings } from "@/db/schema";
import { createCalendarEvent, updateCalendarEvent } from "@/lib/google-calendar";
import { sendBookingConfirmationEmail, sendBookingRejectionEmail } from "@/lib/sendBookingEmail";
import { eq } from "drizzle-orm";
import { after } from "next/server";

export async function updateBookingStatus(
  bookingId: number,
  newStatus: 'confirmed' | 'pending' | 'rejected'
) {
  try {
    const result = await db
      .update(bookings)
      .set({ status: newStatus })
      .where(eq(bookings.id, bookingId))
      .returning();

    const updatedBooking = result[0] as typeof result[0] | undefined;

    if (!updatedBooking) {
      throw new Error(`Booking with ID ${bookingId.toString()} not found.`);
    }

    if (newStatus === 'confirmed' && !updatedBooking.eventId) {
      // No existing calendar event (edge case) — create one
      const eventId = await createCalendarEvent(updatedBooking);
      await db
        .update(bookings)
        .set({ eventId })
        .where(eq(bookings.id, bookingId));
    } else {
      // Update existing event: patches to [CONFIRMED] or deletes on reject
      await updateCalendarEvent(updatedBooking);
    }

    // Schedule email sending after the response is sent — non-blocking
    const bookingEmail = updatedBooking.email;
    const bookingIdStr = updatedBooking.id.toString();
    after(async () => {
      if (!bookingEmail) {
        console.warn(`Booking ID ${bookingIdStr} was updated to "${newStatus}", but no email is on file.`);
        return;
      }

      if (newStatus === 'confirmed') {
        await sendBookingConfirmationEmail({ ...updatedBooking, to: bookingEmail });
      } else if (newStatus === 'rejected') {
        await sendBookingRejectionEmail({ ...updatedBooking, to: bookingEmail });
      }
    });

    return {
      booking: {
        email: updatedBooking.email,
        endTime: updatedBooking.endTime.toISOString(),
        name: updatedBooking.name,
        purpose: updatedBooking.purpose,
        roomName: updatedBooking.roomName,
        startTime: updatedBooking.startTime.toISOString(),
        status: updatedBooking.status,
      },
      success: true as const,
    };

  } catch (error) {
    console.error('Failed to update booking status:', error);
    return { error: 'Failed to update booking status', success: false as const };
  }
}
