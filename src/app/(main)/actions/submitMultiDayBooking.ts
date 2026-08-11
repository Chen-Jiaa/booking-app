"use server";

import { db } from "@/db";
import { bookingDays, bookings, profiles, rooms } from "@/db/schema";
import { combineDateAndTime } from "@/lib/date-utils";
import { createBookingDayCalendarEvent } from "@/lib/google-calendar";
import { isBookingAllowed } from "@/lib/room-dependencies";
import { sendMultiDayBookingEmail } from "@/lib/sendBookingEmail";
import { and, eq, gt, gte, inArray, isNull, lt, or } from "drizzle-orm";
import { after } from "next/server";
import { z } from "zod";

const dayConfigSchema = z.object({
  date: z.string(),
  dayType: z.enum(["main_event", "rehearsal_setup"]),
  endTime: z.string().optional(),
  isAllDay: z.boolean(),
  startTime: z.string().optional(),
});

const formSchema = z.object({
  clientName: z.string().min(1),
  days: z.array(dayConfigSchema).min(1),
  email: z.string().email(),
  eventName: z.string().min(1),
  expectedAttendance: z.number().nullable(),
  managerName: z.string().min(1),
  managerPhone: z.string().min(1),
  needsLobby: z.boolean(),
  roomId: z.string(),
  roomName: z.string(),
  userId: z.string(),
});

type SubmitMultiDayInput = z.infer<typeof formSchema>;

export async function submitMultiDayBooking(values: SubmitMultiDayInput) {
  formSchema.parse(values);

  const {
    clientName,
    days,
    email,
    eventName,
    expectedAttendance,
    managerName,
    managerPhone,
    needsLobby,
    roomId,
    roomName,
    userId,
  } = values;

  // Compute full timestamps for each day
  const daysWithTimestamps = days.map((day) => {
    const date = new Date(day.date);
    const startTimestamp = day.isAllDay
      ? combineDateAndTime(date, "08:00")
      : combineDateAndTime(date, day.startTime ?? "08:00");
    const endTimestamp = day.isAllDay
      ? combineDateAndTime(date, "23:30")
      : combineDateAndTime(date, day.endTime ?? "23:30");

    return { ...day, date, endTimestamp, startTimestamp };
  });

  // 1. Dependency conflict checks (outside transaction)
  const conflictErrors: string[] = [];

  for (const day of daysWithTimestamps) {
    const result = await isBookingAllowed(
      roomId,
      day.dayType,
      day.date.toISOString(),
      day.startTimestamp.toISOString(),
      day.endTimestamp.toISOString(),
    );
    if (!result.allowed) {
      const dateLabel = day.date.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
      conflictErrors.push(`${dateLabel}: ${result.reason ?? "Conflict detected"}`);
    }
  }

  // Check lobby conflicts if needed
  let lobbyRoom: null | typeof rooms.$inferSelect = null;
  if (needsLobby) {
    const lobbyResult = await db
      .select()
      .from(rooms)
      .where(eq(rooms.name, "Lobby to Main Hall"))
      .limit(1);

    lobbyRoom = (lobbyResult[0] as (typeof lobbyResult)[0] | undefined) ?? null;

    if (lobbyRoom) {
      for (const day of daysWithTimestamps) {
        const result = await isBookingAllowed(
          lobbyRoom.id,
          day.dayType,
          day.date.toISOString(),
          day.startTimestamp.toISOString(),
          day.endTimestamp.toISOString(),
        );
        if (!result.allowed) {
          const dateLabel = day.date.toLocaleDateString("en-MY", {
            day: "numeric",
            month: "short",
          });
          conflictErrors.push(`Lobby - ${dateLabel}: ${result.reason ?? "Conflict detected"}`);
        }
      }
    }
  }

  if (conflictErrors.length > 0) {
    return { conflicts: conflictErrors, success: false as const };
  }

  // Compute overall time span for parent booking row
  const overallStartMs = daysWithTimestamps.reduce(
    (min, d) => Math.min(min, d.startTimestamp.getTime()),
    daysWithTimestamps[0].startTimestamp.getTime(),
  );
  const overallEndMs = daysWithTimestamps.reduce(
    (max, d) => Math.max(max, d.endTimestamp.getTime()),
    daysWithTimestamps[0].endTimestamp.getTime(),
  );
  const overallStart = new Date(overallStartMs);
  const overallEnd = new Date(overallEndMs);

  // 2. DB transaction
  const {
    approvers: roomApprovers,
    insertedBooking: createdBooking,
    insertedDays: createdDays,
    insertedLobbyBooking: createdLobbyBooking,
    insertedLobbyDays: createdLobbyDays,
  } = await db.transaction(async (tx) => {
    // Direct room conflict check for each day (standard bookings)
    for (const day of daysWithTimestamps) {
      const conflicts = await tx
        .select({ id: bookings.id })
        .from(bookings)
        .where(
          and(
            eq(bookings.roomId, roomId),
            inArray(bookings.status, ["pending", "confirmed"]),
            or(eq(bookings.isMultiDay, false), isNull(bookings.isMultiDay)),
            lt(bookings.startTime, day.endTimestamp),
            gt(bookings.endTime, day.startTimestamp),
          ),
        )
        .limit(1);

      if (conflicts.length > 0) {
        const dateLabel = day.date.toLocaleDateString("en-MY", {
          day: "numeric",
          month: "short",
        });
        throw new Error(`Conflict on ${dateLabel}: room is already booked.`);
      }
    }

    // Multi-day booking conflict check for each day via booking_days
    for (const day of daysWithTimestamps) {
      const dayStart = new Date(day.date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day.date);
      dayEnd.setHours(23, 59, 59, 999);

      const multiDayConflicts = await tx
        .select({ id: bookingDays.id })
        .from(bookingDays)
        .innerJoin(bookings, eq(bookingDays.bookingId, bookings.id))
        .where(
          and(
            eq(bookings.roomId, roomId),
            inArray(bookings.status, ["pending", "confirmed"]),
            eq(bookings.isMultiDay, true),
            gte(bookingDays.date, dayStart),
            lt(bookingDays.date, dayEnd),
          ),
        )
        .limit(1);

      if (multiDayConflicts.length > 0) {
        const dateLabel = day.date.toLocaleDateString("en-MY", {
          day: "numeric",
          month: "short",
        });
        throw new Error(`Conflict on ${dateLabel}: room already has a multi-day booking.`);
      }
    }

    // Lobby conflict check inside transaction
    if (needsLobby && lobbyRoom) {
      for (const day of daysWithTimestamps) {
        const lobbyConflicts = await tx
          .select({ id: bookings.id })
          .from(bookings)
          .where(
            and(
              eq(bookings.roomId, lobbyRoom.id),
              inArray(bookings.status, ["pending", "confirmed"]),
              or(eq(bookings.isMultiDay, false), isNull(bookings.isMultiDay)),
              lt(bookings.startTime, day.endTimestamp),
              gt(bookings.endTime, day.startTimestamp),
            ),
          )
          .limit(1);

        if (lobbyConflicts.length > 0) {
          const dateLabel = day.date.toLocaleDateString("en-MY", {
            day: "numeric",
            month: "short",
          });
          throw new Error(`Lobby conflict on ${dateLabel}: lobby is already booked.`);
        }
      }

      // Multi-day lobby conflict check via booking_days
      for (const day of daysWithTimestamps) {
        const dayStart = new Date(day.date);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(day.date);
        dayEnd.setHours(23, 59, 59, 999);

        const lobbyMultiDayConflicts = await tx
          .select({ id: bookingDays.id })
          .from(bookingDays)
          .innerJoin(bookings, eq(bookingDays.bookingId, bookings.id))
          .where(
            and(
              eq(bookings.roomId, lobbyRoom.id),
              inArray(bookings.status, ["pending", "confirmed"]),
              eq(bookings.isMultiDay, true),
              gte(bookingDays.date, dayStart),
              lt(bookingDays.date, dayEnd),
            ),
          )
          .limit(1);

        if (lobbyMultiDayConflicts.length > 0) {
          const dateLabel = day.date.toLocaleDateString("en-MY", {
            day: "numeric",
            month: "short",
          });
          throw new Error(`Lobby conflict on ${dateLabel}: lobby already has a multi-day booking.`);
        }
      }
    }

    // Look up room for approval settings
    const selectedRoom = await tx
      .select({ approvalRequired: rooms.approvalRequired, approvers: rooms.approvers })
      .from(rooms)
      .where(eq(rooms.id, roomId))
      .limit(1);

    const room = selectedRoom[0] as (typeof selectedRoom)[0] | undefined;
    if (!room) throw new Error("Room not found.");

    const approvers = room.approvers ?? [];

    // Insert parent booking
    const insertResult = await tx
      .insert(bookings)
      .values({
        bookingType: "multi_day",
        clientName,
        email,
        endTime: overallEnd,
        eventName,
        expectedAttendance,
        isMultiDay: true,
        name: managerName,
        phone: managerPhone,
        purpose: eventName,
        roomId,
        roomName,
        startTime: overallStart,
        status: "pending",
        userId,
      })
      .returning();

    const insertedBooking = insertResult[0] as (typeof insertResult)[0] | undefined;
    if (!insertedBooking) throw new Error("Failed to create booking.");

    // Insert booking_days
    const insertedDays = await tx
      .insert(bookingDays)
      .values(
        daysWithTimestamps.map((day) => ({
          bookingId: insertedBooking.id,
          date: day.date,
          dayType: day.dayType,
          endTime: day.isAllDay ? null : day.endTimestamp,
          isAllDay: day.isAllDay,
          startTime: day.isAllDay ? null : day.startTimestamp,
        })),
      )
      .returning();

    // Insert linked lobby booking if needed
    let insertedLobbyBooking: null | typeof insertedBooking = null;
    let insertedLobbyDays: null | typeof insertedDays = null;

    if (needsLobby && lobbyRoom) {
      const lobbyInsertResult = await tx
        .insert(bookings)
        .values({
          bookingType: "multi_day",
          clientName,
          email,
          endTime: overallEnd,
          eventName,
          expectedAttendance,
          isMultiDay: true,
          name: managerName,
          parentBookingId: insertedBooking.id,
          phone: managerPhone,
          purpose: eventName,
          roomId: lobbyRoom.id,
          roomName: lobbyRoom.name,
          startTime: overallStart,
          status: "pending",
          userId,
        })
        .returning();

      const lobbyBooking =
        (lobbyInsertResult[0] as (typeof lobbyInsertResult)[0] | undefined) ?? null;
      insertedLobbyBooking = lobbyBooking;

      if (lobbyBooking) {
        insertedLobbyDays = await tx
          .insert(bookingDays)
          .values(
            daysWithTimestamps.map((day) => ({
              bookingId: lobbyBooking.id,
              date: day.date,
              dayType: day.dayType,
              endTime: day.isAllDay ? null : day.endTimestamp,
              isAllDay: day.isAllDay,
              startTime: day.isAllDay ? null : day.startTimestamp,
            })),
          )
          .returning();
      }
    }

    return { approvers, insertedBooking, insertedDays, insertedLobbyBooking, insertedLobbyDays };
  });

  // 3. Google Calendar: create events for each day (outside transaction)
  for (const day of createdDays) {
    try {
      const gcalEventId = await createBookingDayCalendarEvent({
        clientName,
        date: day.date,
        dayType: day.dayType,
        email,
        endTime: day.endTime,
        eventName,
        isAllDay: day.isAllDay ?? false,
        phone: managerPhone,
        roomName,
        startTime: day.startTime,
        status: "pending",
      });

      if (gcalEventId) {
        await db
          .update(bookingDays)
          .set({ eventId: gcalEventId })
          .where(eq(bookingDays.id, day.id));
      }
    } catch (error) {
      console.error(`Failed to create calendar event for day ${day.id}:`, error);
    }
  }

  // Calendar events for lobby days
  if (createdLobbyBooking && createdLobbyDays) {
    for (const day of createdLobbyDays) {
      try {
        const gcalEventId = await createBookingDayCalendarEvent({
          clientName,
          date: day.date,
          dayType: day.dayType,
          email,
          endTime: day.endTime,
          eventName,
          isAllDay: day.isAllDay ?? false,
          phone: managerPhone,
          roomName: createdLobbyBooking.roomName,
          startTime: day.startTime,
          status: "pending",
        });

        if (gcalEventId) {
          await db
            .update(bookingDays)
            .set({ eventId: gcalEventId })
            .where(eq(bookingDays.id, day.id));
        }
      } catch (error) {
        console.error(`Failed to create lobby calendar event for day ${day.id}:`, error);
      }
    }
  }

  // 4. Schedule email notifications and phone save-back after response
  after(async () => {
    // Save phone to profile if missing (FR-27)
    if (userId && managerPhone) {
      try {
        const result = await db
          .select({ phone: profiles.phone })
          .from(profiles)
          .where(eq(profiles.id, userId))
          .limit(1);

        if (result[0] && !result[0].phone) {
          await db
            .update(profiles)
            .set({ phone: managerPhone, updatedAt: new Date() })
            .where(eq(profiles.id, userId));
        }
      } catch (error) {
        console.error("Failed to save phone to profile:", error);
      }
    }

    // Send email to approvers
    if (roomApprovers.length > 0) {
      const daysDetails = createdDays.map((d) => ({
        date: d.date,
        dayType: d.dayType,
        endTime: d.endTime,
        isAllDay: d.isAllDay ?? false,
        startTime: d.startTime,
      }));

      await Promise.all(
        roomApprovers.map((approverEmail) =>
          sendMultiDayBookingEmail({
            ...createdBooking,
            bookingDaysDetails: daysDetails,
            to: approverEmail,
          }),
        ),
      );
    }
  });

  return { booking: createdBooking, success: true as const };
}
