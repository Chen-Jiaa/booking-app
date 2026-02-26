'use server'

import { createClient } from "@/lib/supabase/server";

export interface CalendarBooking {
  createdAt: Date;
  email: string;
  endTime: Date;
  eventId: null | string;
  id: number;
  name: string;
  phone: string;
  purpose: string;
  roomId: null | string;
  roomName: string;
  startTime: Date;
  status: string;
  userId: null | string;
}

interface SupabaseBooking {
  created_at: string;
  email: string;
  end_time: string;
  event_id: null | string;
  id: number;
  name: string;
  phone: string;
  purpose: string;
  room_id: null | string;
  room_name: string;
  start_time: string;
  status: string;
  user_id: null | string;
}

export async function fetchWeekBookings(
  weekStart: string,
  weekEnd: string
): Promise<CalendarBooking[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("bookings")
    .select()
    .lt("start_time", weekEnd)
    .gt("end_time", weekStart)
    .neq("status", "cancelled")
    .order("start_time", { ascending: true });

  if (error) {
    console.error("Error fetching week bookings:", error);
    return [];
  }

  return (data as SupabaseBooking[]).map((booking) => ({
    createdAt: new Date(booking.created_at),
    email: booking.email,
    endTime: new Date(booking.end_time),
    eventId: booking.event_id,
    id: booking.id,
    name: booking.name,
    phone: booking.phone,
    purpose: booking.purpose,
    roomId: booking.room_id,
    roomName: booking.room_name,
    startTime: new Date(booking.start_time),
    status: booking.status,
    userId: booking.user_id,
  }));
}
