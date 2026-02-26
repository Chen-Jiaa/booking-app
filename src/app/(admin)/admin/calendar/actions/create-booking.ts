'use server'

import { db } from "@/db";
import { bookings, rooms } from "@/db/schema";
import { createCalendarEvent } from "@/lib/google-calendar";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createBookingSchema = z.object({
  email: z.string().email(),
  endTime: z.string(),
  name: z.string().min(2),
  phone: z.string().min(7),
  purpose: z.string().min(1),
  roomId: z.string(),
  startTime: z.string(),
  status: z.enum(["pending", "confirmed"]),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export async function createAdminBooking(input: CreateBookingInput) {
  const validated = createBookingSchema.parse(input);

  const booking = await db.transaction(async (tx) => {
    const [room] = await tx
      .select({ name: rooms.name })
      .from(rooms)
      .where(eq(rooms.id, validated.roomId))
      .limit(1);

    const [insertedBooking] = await tx
      .insert(bookings)
      .values({
        email: validated.email,
        endTime: new Date(validated.endTime),
        name: validated.name,
        phone: validated.phone,
        purpose: validated.purpose,
        roomId: validated.roomId,
        roomName: room.name,
        startTime: new Date(validated.startTime),
        status: validated.status,
      })
      .returning();

    const eventId = await createCalendarEvent(insertedBooking);

    const [finalBooking] = await tx
      .update(bookings)
      .set({ eventId })
      .where(eq(bookings.id, insertedBooking.id))
      .returning();

    return finalBooking;
  });

  revalidatePath("/admin/calendar");
  return booking;
}
