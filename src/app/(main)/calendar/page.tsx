import { CALENDAR_ACCESS } from "@/lib/config";
import { getUserAndRole } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

import { fetchCalendarRooms } from "./actions/fetchCalendarBookings";
import { EventCalendarLoader } from "./components/EventCalendarLoader";

export default async function CalendarPage() {
  const [rooms, { role, user }] = await Promise.all([
    fetchCalendarRooms(),
    getUserAndRole(),
  ]);

  if (
    CALENDAR_ACCESS === "restricted" &&
    (!user || (role !== "admin" && role !== "event_manager"))
  ) {
    redirect("/");
  }

  return (
    <main className="container mx-auto px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Event Calendar</h1>
        <p className="text-muted-foreground">
          View all room bookings and availability
        </p>
      </div>
      <EventCalendarLoader isLoggedIn={!!user} rooms={rooms} />
    </main>
  );
}
