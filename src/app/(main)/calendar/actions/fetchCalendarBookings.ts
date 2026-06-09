'use server'

import { createClient, getAuthUser } from "@/lib/supabase/server"

export interface CalendarEvent {
  allDay: boolean
  clientName?: null | string
  dayType: 'main_event' | 'rehearsal_setup' | 'standard'
  end: string
  eventName?: null | string
  expectedAttendance?: null | number
  id: string
  picName?: null | string
  picPhone?: null | string
  purpose?: null | string
  roomId: null | string
  roomName: string
  start: string
  status: string
}

export interface CalendarRoom {
  id: string
  name: string
}

interface BookingDayRow {
  booking_id: number
  date: string
  day_type: string
  end_time: null | string
  id: string
  is_all_day: boolean | null
  start_time: null | string
}

interface BookingRow {
  client_name: null | string
  end_time: string
  event_name: null | string
  expected_attendance: null | number
  id: number
  name: string
  phone: string
  purpose: string
  room_id: null | string
  room_name: string
  start_time: string
  status: string
}

export async function fetchCalendarBookings(
  rangeStart: string,
  rangeEnd: string
): Promise<{ events: CalendarEvent[]; isLoggedIn: boolean }> {
  const supabase = await createClient()

  // Run auth check and standard bookings query in parallel
  const [user, { data: standardData }] = await Promise.all([
    getAuthUser(),
    supabase
      .from("bookings")
      .select("id, room_id, room_name, start_time, end_time, status, name, phone, purpose, event_name, client_name, expected_attendance")
      .in("status", ["pending", "confirmed"])
      .or("is_multi_day.is.null,is_multi_day.eq.false")
      .lt("start_time", rangeEnd)
      .gt("end_time", rangeStart)
      .order("start_time", { ascending: true }),
  ])
  const isLoggedIn = !!user

  const events: CalendarEvent[] = []

  if (standardData) {
    for (const row of standardData as BookingRow[]) {
      const event: CalendarEvent = {
        allDay: false,
        dayType: 'standard',
        end: row.end_time,
        id: `booking-${String(row.id)}`,
        roomId: row.room_id,
        roomName: row.room_name,
        start: row.start_time,
        status: row.status,
      }

      if (isLoggedIn) {
        event.clientName = row.client_name
        event.eventName = row.event_name
        event.expectedAttendance = row.expected_attendance
        event.picName = row.name
        event.picPhone = row.phone
        event.purpose = row.purpose
      }

      events.push(event)
    }
  }

  // 2. Multi-day bookings — fetch parent rows then their booking_days
  const { data: multiDayData } = await supabase
    .from("bookings")
    .select("id, room_id, room_name, status, name, phone, purpose, event_name, client_name, expected_attendance, start_time, end_time")
    .in("status", ["pending", "confirmed"])
    .eq("is_multi_day", true)
    .lt("start_time", rangeEnd)
    .gt("end_time", rangeStart)

  if (multiDayData && multiDayData.length > 0) {
    const bookingIds = (multiDayData as BookingRow[]).map(b => b.id)

    const { data: daysData } = await supabase
      .from("booking_days")
      .select("id, booking_id, date, start_time, end_time, is_all_day, day_type")
      .in("booking_id", bookingIds)
      .gte("date", rangeStart)
      .lt("date", rangeEnd)

    if (daysData) {
      const daysByBooking = new Map<number, BookingDayRow[]>()
      for (const day of daysData as BookingDayRow[]) {
        const existing = daysByBooking.get(day.booking_id) ?? []
        existing.push(day)
        daysByBooking.set(day.booking_id, existing)
      }

      for (const booking of multiDayData as BookingRow[]) {
        const days = daysByBooking.get(booking.id) ?? []
        for (const day of days) {
          const isAllDay = day.is_all_day ?? false
          const dateStr = day.date.split('T')[0]

          const event: CalendarEvent = {
            allDay: isAllDay,
            dayType: day.day_type as 'main_event' | 'rehearsal_setup',
            end: isAllDay ? dateStr : (day.end_time ?? day.date),
            id: `day-${day.id}`,
            roomId: booking.room_id,
            roomName: booking.room_name,
            start: isAllDay ? dateStr : (day.start_time ?? day.date),
            status: booking.status,
          }

          if (isLoggedIn) {
            event.clientName = booking.client_name
            event.eventName = booking.event_name
            event.expectedAttendance = booking.expected_attendance
            event.picName = booking.name
            event.picPhone = booking.phone
            event.purpose = booking.purpose
          }

          events.push(event)
        }
      }
    }
  }

  return { events, isLoggedIn }
}

export async function fetchCalendarRooms(): Promise<CalendarRoom[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("rooms")
    .select("id, name")
    .eq("availability", true)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching rooms:", error)
    return []
  }

  return data as CalendarRoom[]
}
