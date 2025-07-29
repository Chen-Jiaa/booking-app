'use server'

import { db } from "@/db";
import { bookings, rooms } from "@/db/schema";
import { createCalendarEvent } from "@/lib/google-calendar";
import { sendBookingConfirmationEmail, sendBookingEmail } from "@/lib/sendBookingEmail";
import { eq } from "drizzle-orm";
import { z } from "zod";

const formSchema = z.object({
    email: z.string().email(),
    fullEndTime: z.string(),
    fullStartTime: z.string(),
    name: z.string().min(2),
    phone: z.string().min(7),
    purpose: z.string().min(1),
    selectedRoomId: z.string(),
    selectedRoomName: z.string(),
    userId: z.string().optional(),
  })
  
export async function submitBooking(values: z.infer<typeof formSchema>) {
  const bookingWithEventId = await db.transaction(async (tx) => {
    formSchema.parse(values)
    
    const {
        email,
        fullEndTime,
        fullStartTime,
        name,
        phone,
        purpose,
        selectedRoomId,
        selectedRoomName,
        userId,
      } = values

      const selectedRoom = await tx
        .select({
          approvalRequired: rooms.approvalRequired,
          approvers: rooms.approvers,
        })
        .from(rooms)
        .where(eq(rooms.id, selectedRoomId))
        .limit(1)

      const room = selectedRoom[0] as typeof selectedRoom[0] | undefined

      if (!room) {
        throw new Error("The selected room could not be found.")
      }

      const approvalRequired = room.approvalRequired === true;
      const approvers = room.approvers ?? [];
      const status = approvalRequired ? "pending" : "confirmed";

      const insertedBookingresult = await tx
        .insert(bookings)
        .values({
          email,
          endTime: new Date(fullEndTime),
          name,
          phone,
          purpose,
          roomId: selectedRoomId,
          roomName: selectedRoomName,
          startTime: new Date(fullStartTime),
          status,
          userId: userId ?? null,
        })
        .returning()

      const insertedBooking = insertedBookingresult[0] as typeof insertedBookingresult [0] | undefined
        
      if (!insertedBooking) {
        throw new Error("Failed to create booking in the database.");
      }

      const eventId = await createCalendarEvent(insertedBooking);

      const [finalBooking] = await tx
        .update(bookings)
        .set({eventId: eventId})
        .where(eq(bookings.id, insertedBooking.id))
        .returning()
      
      
        await (approvalRequired && approvers.length > 0 ? Promise.all(
              approvers.map((approverEmail) =>
                sendBookingEmail({
                  ...insertedBooking,
                  to: approverEmail,
                })
              )
            ) : sendBookingConfirmationEmail({
              ...insertedBooking,
              to: email
          }));
      
      
      return finalBooking;
  });

  return bookingWithEventId
}