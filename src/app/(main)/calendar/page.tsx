import { CALENDAR_ACCESS } from "@/lib/config";
import { filterRoomsByRole } from "@/lib/roles";
import { getUserAndRole } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { fetchRooms } from "@/app/(main)/actions/fetchRooms";
import { fetchCalendarBookings } from "./actions/fetchCalendarBookings";
import { EventCalendarLoader } from "./components/EventCalendarLoader";

export default async function CalendarPage() {
  const now = new Date();
  // Prefetch current month ±1 so adjacent months are instant
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 2, 1).toISOString();

  const [allRooms, { role, user }, { events: initialEvents }] = await Promise.all([
    fetchRooms(),
    getUserAndRole(),
    fetchCalendarBookings(rangeStart, rangeEnd),
  ]);

  if (
    CALENDAR_ACCESS === "restricted" &&
    (!user || (role !== "admin" && role !== "event_manager"))
  ) {
    redirect("/");
  }

  const rooms = filterRoomsByRole(allRooms, role).map((r) => ({ id: r.id, name: r.name }));

  return (
    <main className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Event Calendar</h1>
        <p className="text-muted-foreground">View all room bookings and availability</p>
      </div>
      <EventCalendarLoader initialEvents={initialEvents} isLoggedIn={!!user} rooms={rooms} />
    </main>
  );
}
