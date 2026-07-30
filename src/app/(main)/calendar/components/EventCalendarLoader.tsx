"use client";

import { Skeleton } from "@/components/ui/skeleton";
import dynamic from "next/dynamic";

import type { CalendarEvent, CalendarRoom } from "../actions/fetchCalendarBookings";

const EventCalendar = dynamic(
  () =>
    import("./EventCalendar").then((m) => ({
      default: m.EventCalendar,
    })),
  {
    loading: () => (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    ),
    ssr: false,
  },
);

export function EventCalendarLoader({
  initialEvents,
  isAdmin,
  isLoggedIn,
  rooms,
}: {
  initialEvents: CalendarEvent[];
  isAdmin?: boolean;
  isLoggedIn: boolean;
  rooms: CalendarRoom[];
}) {
  return <EventCalendar initialEvents={initialEvents} isAdmin={isAdmin} isLoggedIn={isLoggedIn} rooms={rooms} />;
}
