"use server";

import { db } from "@/db";
import { bookingDays, bookings } from "@/db/schema";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  patchCalendarEventSummary,
  updateCalendarEvent,
} from "@/lib/google-calendar";
import { sendBookingConfirmationEmail, sendBookingRejectionEmail } from "@/lib/sendBookingEmail";
import { getUserAndRole } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { after } from "next/server";

export async function updateBookingStatus(
  bookingId: number,
  newStatus: "confirmed" | "pending" | "rejected",
) {
  // This is an exported Server Action — a public HTTP endpoint. It must
  // authorize independently, not rely on its callers doing so.
  const { role } = await getUserAndRole();

  if (role !== "admin") {
    return { error: "Unauthorized: Admin access required", success: false as const };
  }

  try {
    const existing = await db
      .select({ status: bookings.status })
      .from(bookings)
      .where(eq(bookings.id, bookingId))
      .limit(1);

    if (!existing[0]) {
      throw new Error(`Booking with ID ${bookingId.toString()} not found.`);
    }

    const previousStatus = existing[0].status;

    const result = await db
      .update(bookings)
      .set({ status: newStatus })
      .where(eq(bookings.id, bookingId))
      .returning();

    const updatedBooking = result[0] as (typeof result)[0] | undefined;

    if (!updatedBooking) {
      throw new Error(`Booking with ID ${bookingId.toString()} not found.`);
    }

    if (updatedBooking.isMultiDay) {
      // Handle multi-day booking calendar events
      await handleMultiDayCalendarUpdate(updatedBooking, newStatus);

      // Handle linked bookings (e.g., lobby booking with parentBookingId)
      const linkedBookings = await db
        .select()
        .from(bookings)
        .where(eq(bookings.parentBookingId, bookingId));

      for (const linked of linkedBookings) {
        const linkedResult = await db
          .update(bookings)
          .set({ status: newStatus })
          .where(eq(bookings.id, linked.id))
          .returning();

        const updatedLinked = linkedResult[0] as (typeof linkedResult)[0] | undefined;

        if (updatedLinked) {
          await handleMultiDayCalendarUpdate(updatedLinked, newStatus);
        }
      }
    } else {
      // Standard booking (existing logic)
      if (newStatus === "confirmed" && !updatedBooking.eventId) {
        // No existing calendar event (edge case) — create one
        const eventId = await createCalendarEvent(updatedBooking);
        await db.update(bookings).set({ eventId }).where(eq(bookings.id, bookingId));
      } else {
        // Update existing event: patches to [CONFIRMED] or deletes on reject
        await updateCalendarEvent(updatedBooking);
      }
    }

    // Only send email when the status actually changed — prevents duplicate emails
    // if the approve/reject URL is visited more than once.
    if (previousStatus !== newStatus) {
      const bookingEmail = updatedBooking.email;
      const bookingIdStr = updatedBooking.id.toString();
      after(async () => {
        if (!bookingEmail) {
          console.warn(
            `Booking ID ${bookingIdStr} was updated to "${newStatus}", but no email is on file.`,
          );
          return;
        }

        if (newStatus === "confirmed") {
          await sendBookingConfirmationEmail({ ...updatedBooking, to: bookingEmail });
        } else if (newStatus === "rejected") {
          await sendBookingRejectionEmail({ ...updatedBooking, to: bookingEmail });
        }
      });
    }

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
    console.error("Failed to update booking status:", error);
    return { error: "Failed to update booking status", success: false as const };
  }
}

async function handleMultiDayCalendarUpdate(
  booking: typeof bookings.$inferSelect,
  newStatus: string,
) {
  const days = await db.select().from(bookingDays).where(eq(bookingDays.bookingId, booking.id));

  for (const day of days) {
    if (!day.eventId) continue;

    if (newStatus === "confirmed") {
      const dayTypeLabel = day.dayType === "main_event" ? "MAIN EVENT" : "SETUP";
      const summary = `[CONFIRMED - ${dayTypeLabel}] ${booking.roomName} - ${booking.eventName ?? ""} by ${booking.clientName ?? booking.name}`;
      await patchCalendarEventSummary(day.eventId, summary);
    } else if (newStatus === "rejected") {
      try {
        await deleteCalendarEvent(day.eventId);
      } catch (error) {
        console.error(`Failed to delete calendar event for day ${day.id}:`, error);
      }
    }
  }
}
