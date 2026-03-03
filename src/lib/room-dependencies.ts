import { createClient } from "@/lib/supabase/server"

interface RoomInfo {
  dependency_group: null | string
  id: string
  name: string
}

/**
 * Given a booked room and its day type, returns an array of room IDs
 * that should be blocked or restricted.
 *
 * Rules:
 * - Main Hall booked as "main_event" → Lobby is blocked
 * - Main Hall booked as "rehearsal_setup" → Lobby remains available (no blocked rooms)
 * - Lobby booked as "main_event" → Main Hall is blocked for "main_event" only
 *   (this is handled at query time; here we return the Main Hall ID so callers can check)
 * - Lobby booked independently or as "rehearsal_setup" → no rooms blocked
 * - Stage 8 and other rooms → no dependency
 */
export function getBlockedRoomIds(
  roomId: string,
  dayType: null | string,
  rooms: RoomInfo[]
): string[] {
  const room = rooms.find((r) => r.id === roomId)
  if (!room?.dependency_group) return []

  const relatedRooms = rooms.filter(
    (r) => r.id !== roomId && r.dependency_group === room.dependency_group
  )

  if (relatedRooms.length === 0) return []

  const isMainHall = room.name === 'Main Hall'
  const isLobby = room.name === 'Lobby to Main Hall'

  // Main Hall booked as Main Event Day → block Lobby
  if (isMainHall && dayType === 'main_event') {
    return relatedRooms.map((r) => r.id)
  }

  // Lobby booked as Main Event → block Main Hall (for main_event only, handled by caller)
  if (isLobby && dayType === 'main_event') {
    return relatedRooms.map((r) => r.id)
  }

  return []
}

/**
 * Gets unavailable slots for a room based on dependency rules.
 * Returns a set of time slot strings (e.g., "09:00", "09:30") that are
 * blocked due to dependency conflicts.
 */
export async function getDependencyBlockedSlots(
  roomId: string,
  selectedDate: Date,
  timezone: string
): Promise<Set<string>> {
  const { addMinutes, format, parseISO } = await import('date-fns')
  const { toZonedTime } = await import('date-fns-tz')

  const blocked = new Set<string>()

  const supabase = await createClient()

  // Fetch all rooms to determine dependency relationships
  const { data: allRooms } = await supabase
    .from('rooms')
    .select('id, name, dependency_group')

  if (!allRooms) return blocked

  const room = allRooms.find((r: RoomInfo) => r.id === roomId)
  if (!room?.dependency_group) return blocked

  const relatedRooms = allRooms.filter(
    (r: RoomInfo) => r.id !== roomId && r.dependency_group === room.dependency_group
  )

  if (relatedRooms.length === 0) return blocked

  const relatedRoomIds = relatedRooms.map((r: RoomInfo) => r.id)

  const startOfDayLocal = toZonedTime(selectedDate, timezone)
  startOfDayLocal.setHours(0, 0, 0, 0)
  const endOfDayLocal = toZonedTime(selectedDate, timezone)
  endOfDayLocal.setHours(23, 59, 59, 999)

  const dayStartISO = startOfDayLocal.toISOString()
  const dayEndISO = endOfDayLocal.toISOString()

  // Fetch bookings for related rooms on this date
  const { data: relatedBookings } = await supabase
    .from('bookings')
    .select('id, room_id, start_time, end_time, booking_type')
    .in('room_id', relatedRoomIds)
    .in('status', ['pending', 'confirmed'])
    .gte('start_time', dayStartISO)
    .lt('start_time', dayEndISO)

  if (!relatedBookings || relatedBookings.length === 0) return blocked

  // Get booking_days for these bookings to check day types
  const { data: bookingDays } = await supabase
    .from('booking_days')
    .select('booking_id, day_type')
    .in('booking_id', relatedBookings.map((b: { id: number }) => b.id))

  const dayTypeMap = new Map<number, string>()
  if (bookingDays) {
    for (const day of bookingDays) {
      dayTypeMap.set(Number(day.booking_id), String(day.day_type))
    }
  }

  const isMainHall = room.name === 'Main Hall'
  const isLobby = room.name === 'Lobby to Main Hall'

  for (const booking of relatedBookings) {
    const relatedRoom = relatedRooms.find((r: RoomInfo) => r.id === booking.room_id)
    if (!relatedRoom) continue

    const existingDayType = dayTypeMap.get(Number(booking.id)) ?? null

    let shouldBlock = false

    // If we're checking Lobby availability and Main Hall has a main_event booking
    if (isLobby && relatedRoom.name === 'Main Hall' && existingDayType === 'main_event') {
      shouldBlock = true
    }

    // If we're checking Main Hall availability and Lobby has a main_event booking,
    // we DON'T fully block — Main Hall can still be used for rehearsal_setup.
    // This case is handled in isBookingAllowed, not here (slots aren't fully blocked).
    // However for standard bookings (no day type), we should block the slots.
    if (isMainHall && relatedRoom.name === 'Lobby to Main Hall' && existingDayType === 'main_event') {
      // For the slot-based UI (standard bookings), we block these slots since
      // standard bookings don't have a day type and default behavior should prevent conflicts
      shouldBlock = true
    }

    if (shouldBlock) {
      let currentSlot = toZonedTime(parseISO(String(booking.start_time)), timezone)
      const endTimeLocal = toZonedTime(parseISO(String(booking.end_time)), timezone)

      while (currentSlot < endTimeLocal) {
        const timeStr = format(currentSlot, "HH:mm")
        blocked.add(timeStr)
        currentSlot = addMinutes(currentSlot, 30)
      }
    }
  }

  return blocked
}

/**
 * Server-side check that queries existing bookings and returns whether
 * the proposed booking is allowed based on dependency rules.
 *
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export async function isBookingAllowed(
  roomId: string,
  dayType: null | string,
  date: string,
  startTime: string,
  endTime: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient()

  // Fetch all rooms to determine dependency relationships
  const { data: allRooms } = await supabase
    .from('rooms')
    .select('id, name, dependency_group')

  if (!allRooms) return { allowed: true }

  const room = allRooms.find((r: RoomInfo) => r.id === roomId)
  if (!room?.dependency_group) return { allowed: true }

  const relatedRooms = allRooms.filter(
    (r: RoomInfo) => r.id !== roomId && r.dependency_group === room.dependency_group
  )

  if (relatedRooms.length === 0) return { allowed: true }

  const relatedRoomIds = relatedRooms.map((r: RoomInfo) => r.id)

  // Query existing bookings for related rooms that overlap with the proposed time
  const { data: conflictingBookings } = await supabase
    .from('bookings')
    .select('room_id, start_time, end_time, booking_type')
    .in('room_id', relatedRoomIds)
    .in('status', ['pending', 'confirmed'])
    .lt('start_time', endTime)
    .gt('end_time', startTime)

  if (!conflictingBookings || conflictingBookings.length === 0) {
    return { allowed: true }
  }

  // Also check booking_days for multi-day bookings with day types
  const { data: conflictingDays } = await supabase
    .from('booking_days')
    .select('booking_id, day_type, start_time, end_time, is_all_day')
    .gte('date', date)
    .lte('date', date)

  // Build a map of booking_id to day_type from booking_days
  const dayTypeMap = new Map<number, string>()
  if (conflictingDays) {
    for (const day of conflictingDays) {
      dayTypeMap.set(Number(day.booking_id), String(day.day_type))
    }
  }

  const isMainHall = room.name === 'Main Hall'
  const isLobby = room.name === 'Lobby to Main Hall'

  for (const booking of conflictingBookings) {
    const existingDayType = dayTypeMap.get(Number(booking.room_id)) ?? null
    const relatedRoom = relatedRooms.find((r: RoomInfo) => r.id === booking.room_id)

    if (!relatedRoom) continue

    // Rule: Main Hall has a "main_event" booking → Lobby is blocked entirely
    if (isLobby && relatedRoom.name === 'Main Hall') {
      const mainHallDayType = existingDayType ?? (booking.booking_type === 'multi_day' ? null : null)

      // Check if the Main Hall booking is a main_event via booking_days
      if (mainHallDayType === 'main_event') {
        return {
          allowed: false,
          reason: 'The Main Hall has a Main Event booking during this time. The Lobby is unavailable.',
        }
      }
    }

    // Rule: Lobby has a "main_event" booking → Main Hall cannot be "main_event"
    if (isMainHall && relatedRoom.name === 'Lobby to Main Hall') {
      const lobbyDayType = existingDayType

      if (lobbyDayType === 'main_event' && dayType === 'main_event') {
        return {
          allowed: false,
          reason: 'The Lobby has a Main Event booking during this time. The Main Hall cannot be booked as a Main Event Day, but can be booked for Rehearsal / Setup.',
        }
      }
    }
  }

  return { allowed: true }
}
