"use client";

import type { DatesSetArg, EventClickArg } from "@fullcalendar/core";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  type CalendarEvent,
  type CalendarRoom,
  fetchCalendarBookings,
} from "../actions/fetchCalendarBookings";
import { DAY_TYPE_COLORS, DAY_TYPE_LABELS, PENDING_COLORS } from "../constants";
import { BookingDetailPopover } from "./BookingDetailPopover";

interface EventCalendarProps {
  initialEvents: CalendarEvent[];
  isLoggedIn: boolean;
  rooms: CalendarRoom[];
}

export function EventCalendar({ initialEvents, isLoggedIn, rooms }: EventCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedRoom, setSelectedRoom] = useState<string>("all");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = useState(false);

  // Client-side event cache keyed by "YYYY-MM" — seed with server-prefetched data
  const cacheRef = useRef(
    (() => {
      const map = new Map<string, CalendarEvent[]>();
      const now = new Date();
      for (let offset = -1; offset <= 1; offset++) {
        const start = monthStart(now.getFullYear(), now.getMonth() + offset);
        const end = monthStart(now.getFullYear(), now.getMonth() + offset + 1);
        const key = monthKey(start);
        const monthEvents = initialEvents.filter((e) => {
          const eventStart = new Date(e.start);
          return eventStart >= start && eventStart < end;
        });
        map.set(key, monthEvents);
      }
      return map;
    })(),
  );

  // Track in-flight fetches to avoid duplicates
  const fetchingRef = useRef(new Set<string>());
  // Debounce timer for datesSet
  const debounceRef = useRef<null | ReturnType<typeof setTimeout>>(null);

  // Switch to list view on small screens after mount
  useEffect(() => {
    if (window.innerWidth < 768) {
      const api = calendarRef.current?.getApi();
      api?.changeView("listWeek");
    }
  }, []);

  const fetchAndCacheMonth = useCallback(
    async (year: number, month: number): Promise<CalendarEvent[]> => {
      const start = monthStart(year, month);
      const end = monthStart(year, month + 1);
      const key = monthKey(start);

      // Return cached data if available
      const cached = cacheRef.current.get(key);
      if (cached) return cached;

      // Skip if already fetching this month
      if (fetchingRef.current.has(key)) return [];
      fetchingRef.current.add(key);

      try {
        const result = await fetchCalendarBookings(
          start.toISOString(),
          end.toISOString(),
        );
        cacheRef.current.set(key, result.events);
        return result.events;
      } finally {
        fetchingRef.current.delete(key);
      }
    },
    [],
  );

  const handleDatesSet = useCallback(
    (dateInfo: DatesSetArg) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(() => {
        const viewStart = dateInfo.start;
        const viewEnd = dateInfo.end;

        // Collect all months the current view spans
        const monthKeys: { month: number; year: number }[] = [];
        const cursor = new Date(viewStart.getFullYear(), viewStart.getMonth(), 1);
        while (cursor < viewEnd) {
          monthKeys.push({ month: cursor.getMonth(), year: cursor.getFullYear() });
          cursor.setMonth(cursor.getMonth() + 1);
        }

        // Show all cached events immediately — FullCalendar filters by view range internally.
        // Using only the current view's months would drop pre-cached adjacent-month data from state.
        setEvents([...cacheRef.current.values()].flat());

        // Fetch any missing months in the background, then update
        const missing = monthKeys.filter(
          (m) => !cacheRef.current.has(monthKey(monthStart(m.year, m.month))),
        );
        if (missing.length > 0) {
          void Promise.all(
            missing.map((m) => fetchAndCacheMonth(m.year, m.month)),
          ).then(() => {
            setEvents([...cacheRef.current.values()].flat());
          });
        }

        // Prefetch ±1 month beyond the visible range in the background
        const firstMonth = monthKeys[0];
        const lastMonth = monthKeys.at(-1) ?? firstMonth;
        void fetchAndCacheMonth(firstMonth.year, firstMonth.month - 1);
        void fetchAndCacheMonth(lastMonth.year, lastMonth.month + 1);
      }, 300);
    },
    [fetchAndCacheMonth],
  );

  const filteredEvents =
    selectedRoom === "all"
      ? events
      : events.filter((e) => e.roomId === selectedRoom);

  const calendarEvents = filteredEvents.map((event) => {
    const isPending = event.status === "pending";
    const colors = isPending ? PENDING_COLORS : DAY_TYPE_COLORS[event.dayType];
    const dayTypeLabel = DAY_TYPE_LABELS[event.dayType];
    const baseName = event.eventName
      ? `${event.eventName} @ ${event.roomName}`
      : event.roomName;
    const title = isPending
      ? `${baseName} — Pending`
      : event.dayType === "standard"
        ? baseName
        : `${baseName} — ${dayTypeLabel}`;

    return {
      allDay: event.allDay,
      backgroundColor: colors.backgroundColor,
      borderColor: colors.borderColor,
      end: event.end,
      extendedProps: event,
      id: event.id,
      start: event.start,
      textColor: colors.textColor,
      title,
    };
  });

  const handleEventClick = useCallback((info: EventClickArg) => {
    const event = info.event.extendedProps as CalendarEvent;
    setSelectedEvent(event);
    setDialogOpen(true);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">Filter by Room:</span>
        <Select onValueChange={setSelectedRoom} value={selectedRoom}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All Rooms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rooms</SelectItem>
            {rooms.map((room) => (
              <SelectItem key={room.id} value={room.id}>
                {room.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: DAY_TYPE_COLORS.standard.backgroundColor,
              }}
            />
            <span className="text-xs text-muted-foreground">Standard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor:
                  DAY_TYPE_COLORS.rehearsal_setup.backgroundColor,
              }}
            />
            <span className="text-xs text-muted-foreground">
              Rehearsal / Setup
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: DAY_TYPE_COLORS.main_event.backgroundColor,
              }}
            />
            <span className="text-xs text-muted-foreground">Main Event</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span
              className="h-3 w-3 rounded-sm"
              style={{
                backgroundColor: PENDING_COLORS.backgroundColor,
              }}
            />
            <span className="text-xs text-muted-foreground">Pending</span>
          </div>
        </div>
      </div>

      <FullCalendar
        datesSet={handleDatesSet}
        editable={false}
        eventClick={handleEventClick}
        events={calendarEvents}
        eventTimeFormat={{
          hour: "numeric",
          meridiem: "short",
          minute: "2-digit",
        }}
        headerToolbar={{
          center: "title",
          left: "prev,next today",
          right: "dayGridMonth,timeGridWeek,listWeek",
        }}
        height="auto"
        initialView="dayGridMonth"
        nowIndicator
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        ref={calendarRef}
        selectable={false}
        slotLabelFormat={{
          hour: "numeric",
          meridiem: "short",
          minute: "2-digit",
        }}
      />

      <BookingDetailPopover
        event={selectedEvent}
        isLoggedIn={isLoggedIn}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </div>
  );
}

/** Build a "YYYY-MM" cache key from a Date */
function monthKey(date: Date): string {
  return `${String(date.getFullYear())}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Get first-of-month Date for year/month offset from a reference */
function monthStart(year: number, month: number): Date {
  return new Date(year, month, 1);
}
