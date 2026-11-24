"use server";

import { db } from "@/db";
import { bookings, unavailablePeriods } from "@/db/schema";
import { getUserAndRole } from "@/lib/supabase/server";
import { and, inArray, like, lt, gt } from "drizzle-orm";
import { fromZonedTime } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { CLOSURE_PREFIX, CLOSURE_TIMEZONE } from "./closure-format";

const MAX_DAYS = 62;
const DAY_MS = 24 * 60 * 60 * 1000;

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date");
const timeString = z.string().regex(/^\d{2}:\d{2}$/, "Pick a valid time");

const CreateClosureSchema = z
  .object({
    allDay: z.boolean(),
    endDate: dateString,
    endTime: timeString.optional(),
    label: z.string().trim().min(2, "Give the closure a name").max(120),
    roomIds: z.array(z.string().uuid()).min(1, "Select at least one room"),
    startDate: dateString,
    startTime: timeString.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.endDate < data.startDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be on or after the start date",
        path: ["endDate"],
      });
    }
    if (!data.allDay) {
      if (!data.startTime || !data.endTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose a start and end time",
          path: ["startTime"],
        });
      } else if (data.endTime <= data.startTime) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "End time must be after the start time",
          path: ["endTime"],
        });
      }
    }
  });

export interface AffectedBooking {
  id: number;
  name: string;
  roomName: string;
  startTime: string;
  status: string;
}

export type CreateClosureResult =
  | { affectedBookings: AffectedBooking[]; success: true; totalAffected: number }
  | { error: string; success: false };

function addDaysToDateString(date: string, days: number): string {
  return new Date(new Date(`${date}T00:00:00Z`).getTime() + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

export async function createClosure(
  input: z.input<typeof CreateClosureSchema>,
): Promise<CreateClosureResult> {
  const { role } = await getUserAndRole();
  if (role !== "admin") return { error: "Unauthorized", success: false };

  const parsed = CreateClosureSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }
  const data = parsed.data;

  // One block per room per day, so a time window (e.g. 09:00-17:00) applies to
  // each day and never leaks into the hours between days.
  const dates: string[] = [];
  for (let d = data.startDate; d <= data.endDate; d = addDaysToDateString(d, 1)) {
    dates.push(d);
    if (dates.length > MAX_DAYS) {
      return { error: `A closure can be at most ${MAX_DAYS} days long`, success: false };
    }
  }

  const groupId = crypto.randomUUID();
  const rows = dates.flatMap((date) => {
    const startTime = fromZonedTime(
      `${date}T${data.allDay ? "00:00" : data.startTime}:00`,
      CLOSURE_TIMEZONE,
    );
    const endTime = fromZonedTime(
      data.allDay ? `${addDaysToDateString(date, 1)}T00:00:00` : `${date}T${data.endTime}:00`,
      CLOSURE_TIMEZONE,
    );
    return data.roomIds.map((roomId) => ({
      endTime,
      reason: `${CLOSURE_PREFIX}${groupId}:${date}:${data.label}`,
      roomId,
      startTime,
    }));
  });

  try {
    await db.insert(unavailablePeriods).values(rows);

    // Closing a room does not cancel bookings that already exist, so tell the
    // admin which ones are in the way.
    const rangeStart = rows.reduce(
      (min, r) => (r.startTime < min ? r.startTime : min),
      rows[0].startTime,
    );
    const rangeEnd = rows.reduce((max, r) => (r.endTime > max ? r.endTime : max), rows[0].endTime);
    const overlapping = await db
      .select({
        id: bookings.id,
        name: bookings.name,
        roomId: bookings.roomId,
        roomName: bookings.roomName,
        startTime: bookings.startTime,
        endTime: bookings.endTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(
        and(
          inArray(bookings.roomId, data.roomIds),
          inArray(bookings.status, ["pending", "confirmed"]),
          lt(bookings.startTime, rangeEnd),
          gt(bookings.endTime, rangeStart),
        ),
      );

    const affected = overlapping.filter((b) =>
      rows.some((r) => r.roomId === b.roomId && b.startTime < r.endTime && b.endTime > r.startTime),
    );

    revalidatePath("/admin/closures");
    return {
      affectedBookings: affected.slice(0, 25).map((b) => ({
        id: b.id,
        name: b.name,
        roomName: b.roomName,
        startTime: b.startTime.toISOString(),
        status: b.status,
      })),
      success: true,
      totalAffected: affected.length,
    };
  } catch (error) {
    console.error("Failed to create closure:", error);
    return { error: "Failed to create closure", success: false };
  }
}

export async function deleteClosure(groupId: string) {
  const { role } = await getUserAndRole();
  if (role !== "admin") return { error: "Unauthorized", success: false };

  if (!z.string().uuid().safeParse(groupId).success) {
    return { error: "Invalid closure", success: false };
  }

  try {
    await db
      .delete(unavailablePeriods)
      .where(like(unavailablePeriods.reason, `${CLOSURE_PREFIX}${groupId}:%`));
    revalidatePath("/admin/closures");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete closure:", error);
    return { error: "Failed to delete closure", success: false };
  }
}
