"use server";

import { db } from "@/db";
import { bookings, profiles, rooms, unavailablePeriods } from "@/db/schema";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendBookingConfirmationEmail, sendBookingEmail } from "@/lib/sendBookingEmail";
import { getAuthUser } from "@/lib/supabase/server";
import { and, eq, gt, inArray, isNull, lt, or } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";

// Postgres exclusion_violation — raised by the `bookings_no_overlap` constraint
// when an active booking already covers the requested room/time range.
const PG_EXCLUSION_VIOLATION = "23P01";

class BookingConflictError extends Error {
  constructor() {
    super("This time slot has just been booked. Please choose another time.");
    this.name = "BookingConflictError";
  }
}

function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === PG_EXCLUSION_VIOLATION
  );
}

const formSchema = z.object({
  email: z.string().email(),
  fullEndTime: z.string(),
  fullStartTime: z.string(),
  name: z.string().min(2),
  phone: z.string().min(7),
  purpose: z.string().min(1),
  selectedRoomId: z.string(),
  selectedRoomName: z.string(),
});

export async function submitBooking(values: z.infer<typeof formSchema>) {
  const {
    email,
    fullEndTime,
    fullStartTime,
    name,
    phone,
    purpose,
    selectedRoomId,
    selectedRoomName,
  } = formSchema.parse(values);

  // Derive the owning user from the authenticated session — never trust a
  // client-supplied userId. Anonymous bookings are allowed (userId stays null).
  const authUser = await getAuthUser();
  const userId = authUser?.id ?? null;

  const startTime = new Date(fullStartTime);
  const endTime = new Date(fullEndTime);

  // Transaction handles only DB operations — no external API calls
  let transactionResult: {
    approvalRequired: boolean;
    approvers: string[];
    insertedBooking: typeof bookings.$inferSelect;
  };
  try {
    transactionResult = await db.transaction(async (tx) => {
      const selectedRoom = await tx
        .select({
          approvalRequired: rooms.approvalRequired,
          approvers: rooms.approvers,
        })
        .from(rooms)
        .where(eq(rooms.id, selectedRoomId))
        .limit(1);

      const room = selectedRoom[0] as (typeof selectedRoom)[0] | undefined;

      if (!room) {
        throw new Error("The selected room could not be found.");
      }

      // Re-validate availability inside the transaction. This catches the common
      // case cleanly; the DB-level `bookings_no_overlap` exclusion constraint is
      // the authoritative guard against the concurrent double-booking race.
      // Scoped to standard bookings — multi-day availability lives in booking_days
      // and is enforced by the multi-day flow (see submitMultiDayBooking).
      const overlapping = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.roomId, selectedRoomId),
            inArray(bookings.status, ["pending", "confirmed"]),
            or(eq(bookings.isMultiDay, false), isNull(bookings.isMultiDay)),
            lt(bookings.startTime, endTime),
            gt(bookings.endTime, startTime),
          ),
        )
        .limit(1);

      if (overlapping.length > 0) {
        throw new BookingConflictError();
      }

      // The direct calendar sync stores external holds as unavailable periods.
      // Check them again at write time so a manually submitted request cannot
      // bypass the disabled time slots in the client.
      const externalOverlap = await tx
        .select({ id: unavailablePeriods.id })
        .from(unavailablePeriods)
        .where(
          and(
            eq(unavailablePeriods.roomId, selectedRoomId),
            lt(unavailablePeriods.startTime, endTime),
            gt(unavailablePeriods.endTime, startTime),
          ),
        )
        .limit(1);

      if (externalOverlap.length > 0) {
        throw new BookingConflictError();
      }

      const approvalRequired = room.approvalRequired === true;
      const approvers = room.approvers ?? [];
      const status = approvalRequired ? "pending" : "confirmed";

      const insertedBookingresult = await tx
        .insert(bookings)
        .values({
          email,
          endTime,
          name,
          phone,
          purpose,
          roomId: selectedRoomId,
          roomName: selectedRoomName,
          startTime,
          status,
          userId: userId ?? null,
        })
        .returning();

      const insertedBooking = insertedBookingresult[0] as
        | (typeof insertedBookingresult)[0]
        | undefined;

      if (!insertedBooking) {
        throw new Error("Failed to create booking in the database.");
      }

      return { approvalRequired, approvers, insertedBooking };
    });
  } catch (error) {
    // A concurrent request won the race between our availability re-check and
    // the insert (re-check miss → exclusion constraint). Report a clean conflict.
    if (error instanceof BookingConflictError || isExclusionViolation(error)) {
      return { reason: "conflict" as const, success: false as const };
    }
    throw error;
  }

  const { approvalRequired, approvers, insertedBooking } = transactionResult;

  // Google Calendar API call runs outside the transaction to avoid holding a DB connection
  const eventId = await createCalendarEvent(insertedBooking);

  const [finalBooking] = await db
    .update(bookings)
    .set({ eventId })
    .where(eq(bookings.id, insertedBooking.id))
    .returning();

  // Schedule email sending and phone save-back after the response is sent — non-blocking
  after(async () => {
    // Save phone number back to profile if missing (FR-27)
    if (userId && phone) {
      try {
        const result = await db
          .select({ phone: profiles.phone })
          .from(profiles)
          .where(eq(profiles.id, userId))
          .limit(1);

        if (result[0] && !result[0].phone) {
          await db
            .update(profiles)
            .set({ phone, updatedAt: new Date() })
            .where(eq(profiles.id, userId));
        }
      } catch (error) {
        console.error("Failed to save phone to profile:", error);
      }
    }

    await (approvalRequired && approvers.length > 0
      ? Promise.all(
          approvers.map((approverEmail) =>
            sendBookingEmail({
              ...insertedBooking,
              to: approverEmail,
            }),
          ),
        )
      : sendBookingConfirmationEmail({
          ...insertedBooking,
          to: email,
        }));
  });

  return { booking: finalBooking, success: true as const };
}
