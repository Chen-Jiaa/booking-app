import { fetchRooms } from "@/app/(main)/actions/fetchRooms";
import { addDays, format, parseISO, startOfWeek } from "date-fns";

import { fetchWeekBookings } from "./actions/fetch-week-bookings";
import { CalendarGrid } from "./components/calendar-grid";
import { CalendarList } from "./components/calendar-list";
import { WeekNavigator } from "./components/week-navigator";

interface PageProps {
  searchParams: Promise<{ week?: string }>;
}

export default async function AdminCalendarPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const weekParam = params.week;

  const weekStart = weekParam
    ? startOfWeek(parseISO(weekParam), { weekStartsOn: 1 })
    : startOfWeek(new Date(), { weekStartsOn: 1 });

  const weekEnd = addDays(weekStart, 7);

  const [rooms, bookings] = await Promise.all([
    fetchRooms(),
    fetchWeekBookings(
      format(weekStart, "yyyy-MM-dd'T'HH:mm:ssXXX"),
      format(weekEnd, "yyyy-MM-dd'T'HH:mm:ssXXX"),
    ),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Room Calendar</h1>
          <p className="text-muted-foreground">View and manage room bookings</p>
        </div>
        <WeekNavigator weekStart={weekStart} />
      </div>

      <div className="hidden md:block">
        <CalendarGrid bookings={bookings} rooms={rooms} weekStart={weekStart} />
      </div>

      <div className="md:hidden">
        <CalendarList bookings={bookings} weekStart={weekStart} />
      </div>
    </div>
  );
}

