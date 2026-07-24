"use server";

import { getDependencyBlockedSlots } from "@/lib/room-dependencies";
import { createClient } from "@/lib/supabase/server";
import { addMinutes, format, parseISO } from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface BookingDayType {
  end_time: null | string;
  is_all_day: boolean | null;
  start_time: null | string;
}

interface BookingType {
  end_time: string;
  start_time: string;
}

export async function getUnavailableSlots(
  roomId: string,
  selectedDate: Date,
  timezone = "Asia/Kuala_Lumpur",
  excludeBookingId?: number,
): Promise<Set<string>> {
  try {
    const startOfDayLocal = toZonedTime(selectedDate, timezone);
    startOfDayLocal.setHours(0, 0, 0, 0);

    const endOfDayLocal = toZonedTime(selectedDate, timezone);
    endOfDayLocal.setHours(23, 59, 59, 999);

    const dayStartISO = startOfDayLocal.toISOString();
    const dayEndISO = endOfDayLocal.toISOString();

    const supabase = await createClient();

    // 1. Standard (non-multi-day) bookings overlapping this day
    let standardQuery = supabase
      .from("bookings")
      .select<string, BookingType>("start_time, end_time")
      .eq("room_id", roomId)
      .in("status", ["pending", "confirmed"])
      .or("is_multi_day.is.null,is_multi_day.eq.false")
      .lt("start_time", dayEndISO)
      .gt("end_time", dayStartISO);

    if (excludeBookingId != null) {
      standardQuery = standardQuery
        .neq("id", excludeBookingId)
        .or(`parent_booking_id.is.null,parent_booking_id.neq.${excludeBookingId.toString()}`);
    }

    // 2. Multi-day parent bookings for this room
    let multiQuery = supabase
      .from("bookings")
      .select("id")
      .eq("room_id", roomId)
      .in("status", ["pending", "confirmed"])
      .eq("is_multi_day", true);

    if (excludeBookingId != null) {
      multiQuery = multiQuery
        .neq("id", excludeBookingId)
        .or(`parent_booking_id.is.null,parent_booking_id.neq.${excludeBookingId.toString()}`);
    }

    // 3. Unavailable periods (admin-blocked slots + external GCal events)
    const unavailableQuery = supabase
      .from("unavailable_periods")
      .select<string, BookingType>("start_time, end_time")
      .eq("room_id", roomId)
      .lt("start_time", dayEndISO)
      .gt("end_time", dayStartISO);

    // Queries are independent — run them in parallel
    const [
      { data: standardBookings },
      { data: multiDayBookings },
      { data: unavailablePeriods },
      dependencyBlocked,
    ] = await Promise.all([
      standardQuery,
      multiQuery,
      unavailableQuery,
      getDependencyBlockedSlots(roomId, selectedDate, timezone, excludeBookingId),
    ]);

    const booked = new Set<string>();

    if (standardBookings && standardBookings.length > 0) {
      for (const booking of standardBookings) {
        let currentSlot = toZonedTime(parseISO(booking.start_time), timezone);
        const endTimeLocal = toZonedTime(parseISO(booking.end_time), timezone);

        while (currentSlot < endTimeLocal) {
          const timeStr = format(currentSlot, "HH:mm");
          booked.add(timeStr);
          currentSlot = addMinutes(currentSlot, 30);
        }
      }
    }

    // 3. booking_days for the multi-day parents found above
    if (multiDayBookings && multiDayBookings.length > 0) {
      const bookingIds = multiDayBookings.map((b: { id: number }) => b.id);
      const { data: multiDayDays } = await supabase
        .from("booking_days")
        .select<string, BookingDayType>("start_time, end_time, is_all_day")
        .in("booking_id", bookingIds)
        .gte("date", dayStartISO)
        .lt("date", dayEndISO);

      if (multiDayDays && multiDayDays.length > 0) {
        for (const day of multiDayDays) {
          if (day.is_all_day) {
            // Block all operating hours (08:00–23:00)
            const allDayStart = toZonedTime(selectedDate, timezone);
            allDayStart.setHours(8, 0, 0, 0);
            const allDayEnd = toZonedTime(selectedDate, timezone);
            allDayEnd.setHours(23, 30, 0, 0);
            let currentSlot = new Date(allDayStart);
            while (currentSlot < allDayEnd) {
              booked.add(format(currentSlot, "HH:mm"));
              currentSlot = addMinutes(currentSlot, 30);
            }
          } else if (day.start_time && day.end_time) {
            let currentSlot = toZonedTime(parseISO(day.start_time), timezone);
            const endTimeLocal = toZonedTime(parseISO(day.end_time), timezone);
            while (currentSlot < endTimeLocal) {
              booked.add(format(currentSlot, "HH:mm"));
              currentSlot = addMinutes(currentSlot, 30);
            }
          }
        }
      }
    }

    if (unavailablePeriods && unavailablePeriods.length > 0) {
      for (const period of unavailablePeriods) {
        let currentSlot = toZonedTime(parseISO(period.start_time), timezone);
        const endTimeLocal = toZonedTime(parseISO(period.end_time), timezone);
        while (currentSlot < endTimeLocal) {
          booked.add(format(currentSlot, "HH:mm"));
          currentSlot = addMinutes(currentSlot, 30);
        }
      }
    }

    for (const slot of dependencyBlocked) {
      booked.add(slot);
    }

    return booked;
  } catch (error) {
    console.error("Error fetching unavailable slots:", error);
    return new Set<string>();
  }
}
