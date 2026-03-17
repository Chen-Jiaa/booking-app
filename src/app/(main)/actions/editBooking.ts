'use server'

import { db } from "@/db"
import { bookingDays, bookings, rooms } from "@/db/schema"
import { combineDateAndTime } from "@/lib/date-utils"
import { createBookingDayCalendarEvent, createCalendarEvent, deleteCalendarEvent, patchCalendarEventSummary } from "@/lib/google-calendar"
import { sendBookingEmail, sendMultiDayBookingEmail } from "@/lib/sendBookingEmail"
import { createClient } from "@/lib/supabase/server"
import { and, eq, gt, inArray, lt, ne } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { after } from "next/server"

// --- Interfaces ---

interface EditMultiDayBookingInput {
  bookingId: number
  clientName: string
  days: {
    date: string
    dayType: 'main_event' | 'rehearsal_setup'
    endTime?: string
    isAllDay: boolean
    startTime?: string
  }[]
  eventName: string
  expectedAttendance: null | number
}

interface EditStandardBookingInput {
  bookingId: number
  email: string
  endTime: string
  name: string
  phone: string
  purpose: string
  startTime: string
}

// --- Multi-Day Booking Edit ---

export async function editMultiDayBooking(input: EditMultiDayBookingInput) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to edit a booking.', success: false }
  }

  const { bookingId, clientName, days, eventName, expectedAttendance } = input

  // Fetch original booking
  const originalResult = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1)

  const originalBooking = originalResult[0] as typeof originalResult[0] | undefined

  if (!originalBooking) {
    return { error: 'Booking not found.', success: false }
  }

  if (originalBooking.userId !== user.id) {
    return { error: 'You do not have permission to edit this booking.', success: false }
  }

  if (originalBooking.status === 'cancelled') {
    return { error: 'Cannot edit a cancelled booking.', success: false }
  }

  // Fetch original booking_days
  const originalDays = await db
    .select()
    .from(bookingDays)
    .where(eq(bookingDays.bookingId, bookingId))

  // Compute full timestamps for each new day
  const daysWithTimestamps = days.map((day) => {
    const date = new Date(day.date)
    const startTimestamp = day.isAllDay
      ? combineDateAndTime(date, '08:00')
      : combineDateAndTime(date, day.startTime ?? '08:00')
    const endTimestamp = day.isAllDay
      ? combineDateAndTime(date, '23:30')
      : combineDateAndTime(date, day.endTime ?? '23:30')

    return { ...day, date, endTimestamp, startTimestamp }
  })

  const datesChanged = checkMultiDayDatesChanged(originalDays, daysWithTimestamps)

  // Fetch linked bookings (e.g., lobby booking)
  const linkedBookings = await db
    .select()
    .from(bookings)
    .where(eq(bookings.parentBookingId, bookingId))

  if (datesChanged) {
    // Delete all old booking_days calendar events for main booking
    for (const day of originalDays) {
      if (day.eventId) {
        try {
          await deleteCalendarEvent(day.eventId)
        } catch (error) {
          console.error(`Failed to delete calendar event for day ${day.id}:`, error)
        }
      }
    }

    // Delete linked bookings' booking_days calendar events
    for (const linked of linkedBookings) {
      const linkedDays = await db
        .select()
        .from(bookingDays)
        .where(eq(bookingDays.bookingId, linked.id))

      for (const day of linkedDays) {
        if (day.eventId) {
          try {
            await deleteCalendarEvent(day.eventId)
          } catch (error) {
            console.error(`Failed to delete linked calendar event for day ${day.id}:`, error)
          }
        }
      }

      // Delete linked booking_days rows
      await db.delete(bookingDays).where(eq(bookingDays.bookingId, linked.id))
    }

    // Delete old booking_days rows for main booking
    await db.delete(bookingDays).where(eq(bookingDays.bookingId, bookingId))

    // Compute overall start/end from new days
    const overallStartMs = daysWithTimestamps.reduce(
      (min, d) => Math.min(min, d.startTimestamp.getTime()),
      daysWithTimestamps[0].startTimestamp.getTime()
    )
    const overallEndMs = daysWithTimestamps.reduce(
      (max, d) => Math.max(max, d.endTimestamp.getTime()),
      daysWithTimestamps[0].endTimestamp.getTime()
    )
    const overallStart = new Date(overallStartMs)
    const overallEnd = new Date(overallEndMs)

    // Update parent booking
    const updateResult = await db
      .update(bookings)
      .set({
        clientName,
        endTime: overallEnd,
        eventName,
        expectedAttendance,
        purpose: eventName,
        startTime: overallStart,
        status: 'pending',
      })
      .where(eq(bookings.id, bookingId))
      .returning()

    const updatedBooking = updateResult[0] as typeof updateResult[0] | undefined

    if (!updatedBooking) {
      return { error: 'Failed to update booking.', success: false }
    }

    // Insert new booking_days
    const insertedDays = await db
      .insert(bookingDays)
      .values(
        daysWithTimestamps.map((day) => ({
          bookingId,
          date: day.date,
          dayType: day.dayType,
          endTime: day.isAllDay ? null : day.endTimestamp,
          isAllDay: day.isAllDay,
          startTime: day.isAllDay ? null : day.startTimestamp,
        }))
      )
      .returning()

    // Create new calendar events for each day
    for (const day of insertedDays) {
      try {
        const gcalEventId = await createBookingDayCalendarEvent({
          clientName,
          date: day.date,
          dayType: day.dayType,
          email: updatedBooking.email,
          endTime: day.endTime,
          eventName,
          isAllDay: day.isAllDay ?? false,
          phone: updatedBooking.phone,
          roomName: updatedBooking.roomName,
          startTime: day.startTime,
          status: 'pending',
        })

        if (gcalEventId) {
          await db
            .update(bookingDays)
            .set({ eventId: gcalEventId })
            .where(eq(bookingDays.id, day.id))
        }
      } catch (error) {
        console.error(`Failed to create calendar event for day ${day.id}:`, error)
      }
    }

    // Update linked bookings similarly
    for (const linked of linkedBookings) {
      await db
        .update(bookings)
        .set({
          clientName,
          endTime: overallEnd,
          eventName,
          expectedAttendance,
          purpose: eventName,
          startTime: overallStart,
          status: 'pending',
        })
        .where(eq(bookings.id, linked.id))

      // Insert new linked booking_days
      const insertedLinkedDays = await db
        .insert(bookingDays)
        .values(
          daysWithTimestamps.map((day) => ({
            bookingId: linked.id,
            date: day.date,
            dayType: day.dayType,
            endTime: day.isAllDay ? null : day.endTimestamp,
            isAllDay: day.isAllDay,
            startTime: day.isAllDay ? null : day.startTimestamp,
          }))
        )
        .returning()

      // Create calendar events for linked booking days
      for (const day of insertedLinkedDays) {
        try {
          const gcalEventId = await createBookingDayCalendarEvent({
            clientName,
            date: day.date,
            dayType: day.dayType,
            email: linked.email,
            endTime: day.endTime,
            eventName,
            isAllDay: day.isAllDay ?? false,
            phone: linked.phone,
            roomName: linked.roomName,
            startTime: day.startTime,
            status: 'pending',
          })

          if (gcalEventId) {
            await db
              .update(bookingDays)
              .set({ eventId: gcalEventId })
              .where(eq(bookingDays.id, day.id))
          }
        } catch (error) {
          console.error(`Failed to create linked calendar event for day ${day.id}:`, error)
        }
      }
    }

    // Send emails to approvers via after()
    const approvers = originalBooking.roomId
      ? await getApprovers(originalBooking.roomId)
      : []

    after(async () => {
      if (approvers.length > 0) {
        const daysDetails = insertedDays.map((d) => ({
          date: d.date,
          dayType: d.dayType,
          endTime: d.endTime,
          isAllDay: d.isAllDay ?? false,
          startTime: d.startTime,
        }))

        await Promise.all(
          approvers.map((approverEmail) =>
            sendMultiDayBookingEmail({
              ...updatedBooking,
              bookingDaysDetails: daysDetails,
              to: approverEmail,
            })
          )
        )
      }
    })
  } else {
    // Non-date path: update booking fields (no status change)
    await db
      .update(bookings)
      .set({ clientName, eventName, expectedAttendance, purpose: eventName })
      .where(eq(bookings.id, bookingId))

    // Patch calendar events for all booking_days
    for (const day of originalDays) {
      if (day.eventId) {
        const dayTypeLabel = day.dayType === 'main_event' ? 'MAIN EVENT' : 'SETUP'
        const statusLabel = originalBooking.status.toUpperCase()
        const summary = `[${statusLabel} - ${dayTypeLabel}] ${originalBooking.roomName} - ${eventName} by ${clientName}`
        try {
          await patchCalendarEventSummary(day.eventId, summary)
        } catch (error) {
          console.error(`Failed to patch calendar event for day ${day.id}:`, error)
        }
      }
    }

    // Update linked bookings' fields too and patch their calendar events
    for (const linked of linkedBookings) {
      await db
        .update(bookings)
        .set({ clientName, eventName, expectedAttendance, purpose: eventName })
        .where(eq(bookings.id, linked.id))

      const linkedDays = await db
        .select()
        .from(bookingDays)
        .where(eq(bookingDays.bookingId, linked.id))

      for (const day of linkedDays) {
        if (day.eventId) {
          const dayTypeLabel = day.dayType === 'main_event' ? 'MAIN EVENT' : 'SETUP'
          const statusLabel = linked.status.toUpperCase()
          const summary = `[${statusLabel} - ${dayTypeLabel}] ${linked.roomName} - ${eventName} by ${clientName}`
          try {
            await patchCalendarEventSummary(day.eventId, summary)
          } catch (error) {
            console.error(`Failed to patch linked calendar event for day ${day.id}:`, error)
          }
        }
      }
    }
  }

  revalidatePath('/bookings')
  return { datesChanged, success: true }
}

// --- Standard Booking Edit ---

export async function editStandardBooking(input: EditStandardBookingInput) {
  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return { error: 'You must be logged in to edit a booking.', success: false }
  }

  const { bookingId, email, endTime, name, phone, purpose, startTime } = input

  // Fetch original booking
  const originalResult = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id, bookingId))
    .limit(1)

  const originalBooking = originalResult[0] as typeof originalResult[0] | undefined

  if (!originalBooking) {
    return { error: 'Booking not found.', success: false }
  }

  if (originalBooking.userId !== user.id) {
    return { error: 'You do not have permission to edit this booking.', success: false }
  }

  if (originalBooking.status === 'cancelled') {
    return { error: 'Cannot edit a cancelled booking.', success: false }
  }

  const newStartTime = new Date(startTime)
  const newEndTime = new Date(endTime)

  const datesChanged =
    originalBooking.startTime.getTime() !== newStartTime.getTime() ||
    originalBooking.endTime.getTime() !== newEndTime.getTime()

  if (datesChanged) {
    // Check for time slot conflicts (excluding current booking)
    const conflicts = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          originalBooking.roomId ? eq(bookings.roomId, originalBooking.roomId) : undefined,
          inArray(bookings.status, ['pending', 'confirmed']),
          ne(bookings.id, bookingId),
          lt(bookings.startTime, newEndTime),
          gt(bookings.endTime, newStartTime)
        )
      )
      .limit(1)

    if (conflicts.length > 0) {
      return { error: 'The selected time slot conflicts with an existing booking.', success: false }
    }

    // Delete old Google Calendar event if exists
    if (originalBooking.eventId) {
      try {
        await deleteCalendarEvent(originalBooking.eventId)
      } catch (error) {
        console.error('Failed to delete old calendar event:', error)
      }
    }

    // Update booking with new data + status='pending'
    const updateResult = await db
      .update(bookings)
      .set({
        email,
        endTime: newEndTime,
        eventId: null,
        name,
        phone,
        purpose,
        startTime: newStartTime,
        status: 'pending',
      })
      .where(eq(bookings.id, bookingId))
      .returning()

    const updatedBooking = updateResult[0] as typeof updateResult[0] | undefined

    if (!updatedBooking) {
      return { error: 'Failed to update booking.', success: false }
    }

    // Create new Google Calendar event
    try {
      const eventId = await createCalendarEvent(updatedBooking)
      await db
        .update(bookings)
        .set({ eventId })
        .where(eq(bookings.id, bookingId))
    } catch (error) {
      console.error('Failed to create new calendar event:', error)
    }

    // Send emails to room approvers via after() callback
    const approvers = originalBooking.roomId
      ? await getApprovers(originalBooking.roomId)
      : []

    after(async () => {
      if (approvers.length > 0) {
        await Promise.all(
          approvers.map((approverEmail) =>
            sendBookingEmail({
              ...updatedBooking,
              to: approverEmail,
            })
          )
        )
      }
    })
  } else {
    // Non-date path: update booking fields in place (no status change)
    await db
      .update(bookings)
      .set({ email, name, phone, purpose })
      .where(eq(bookings.id, bookingId))

    // Patch Google Calendar event summary if eventId exists
    if (originalBooking.eventId) {
      const summaryStatus = `[${originalBooking.status.toUpperCase()}]`
      const summary = `${summaryStatus} ${originalBooking.roomName} by ${name} for ${purpose}`
      try {
        await patchCalendarEventSummary(originalBooking.eventId, summary)
      } catch (error) {
        console.error('Failed to patch calendar event:', error)
      }
    }
  }

  revalidatePath('/bookings')
  return { datesChanged, success: true }
}

// --- Helpers ---

function checkMultiDayDatesChanged(
  originalDays: typeof bookingDays.$inferSelect[],
  newDays: { date: Date; dayType: string; endTimestamp: Date; isAllDay: boolean; startTimestamp: Date }[]
): boolean {
  if (originalDays.length !== newDays.length) return true

  const sortedOriginal = [...originalDays].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )
  const sortedNew = [...newDays].sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  )

  for (const [i, orig] of sortedOriginal.entries()) {
    const updated = sortedNew[i]

    // Compare date at day level
    const origDate = new Date(orig.date)
    origDate.setHours(0, 0, 0, 0)
    const newDate = new Date(updated.date)
    newDate.setHours(0, 0, 0, 0)
    if (origDate.getTime() !== newDate.getTime()) return true

    if ((orig.isAllDay ?? false) !== updated.isAllDay) return true
    if (orig.dayType !== updated.dayType) return true

    // Compare start/end times
    const origStart = orig.startTime?.getTime() ?? null
    const newStart = updated.startTimestamp.getTime()
    if (origStart !== newStart) return true

    const origEnd = orig.endTime?.getTime() ?? null
    const newEnd = updated.endTimestamp.getTime()
    if (origEnd !== newEnd) return true
  }

  return false
}

async function getApprovers(roomId: string): Promise<string[]> {
  const result = await db
    .select({ approvers: rooms.approvers })
    .from(rooms)
    .where(eq(rooms.id, roomId))
    .limit(1)

  const room = result[0] as typeof result[0] | undefined
  return room?.approvers ?? []
}
