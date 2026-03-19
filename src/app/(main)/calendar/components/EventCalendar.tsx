'use client'

import type { DatesSetArg, EventClickArg } from '@fullcalendar/core'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import FullCalendar from '@fullcalendar/react'
import timeGridPlugin from '@fullcalendar/timegrid'
import { useCallback, useEffect, useRef, useState } from "react"

import { type CalendarEvent, type CalendarRoom, fetchCalendarBookings } from "../actions/fetchCalendarBookings"
import { DAY_TYPE_COLORS, DAY_TYPE_LABELS } from "../constants"
import { BookingDetailPopover } from "./BookingDetailPopover"

interface EventCalendarProps {
  isLoggedIn: boolean
  rooms: CalendarRoom[]
}

export function EventCalendar({ isLoggedIn, rooms }: EventCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedRoom, setSelectedRoom] = useState<string>('all')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  // Switch to list view on small screens after mount
  useEffect(() => {
    if (window.innerWidth < 768) {
      const api = calendarRef.current?.getApi()
      api?.changeView('listWeek')
    }
  }, [])

  const loadEvents = useCallback(async (start: string, end: string) => {
    const result = await fetchCalendarBookings(start, end)
    setEvents(result.events)
  }, [])

  const filteredEvents = selectedRoom === 'all'
    ? events
    : events.filter(e => e.roomId === selectedRoom)

  const calendarEvents = filteredEvents.map(event => {
    const colors = DAY_TYPE_COLORS[event.dayType] ?? DAY_TYPE_COLORS.standard
    const dayTypeLabel = DAY_TYPE_LABELS[event.dayType] ?? ''
    const title = event.dayType === 'standard'
      ? event.roomName
      : `${event.roomName} — ${dayTypeLabel}`

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
    }
  })

  const handleEventClick = useCallback((info: EventClickArg) => {
    const event = info.event.extendedProps as CalendarEvent
    setSelectedEvent(event)
    setDialogOpen(true)
  }, [])

  const handleDatesSet = useCallback((dateInfo: DatesSetArg) => {
    void loadEvents(dateInfo.start.toISOString(), dateInfo.end.toISOString())
  }, [loadEvents])

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
            {rooms.map(room => (
              <SelectItem key={room.id} value={room.id}>{room.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: DAY_TYPE_COLORS.standard.backgroundColor }} />
            <span className="text-xs text-muted-foreground">Standard</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: DAY_TYPE_COLORS.rehearsal_setup.backgroundColor }} />
            <span className="text-xs text-muted-foreground">Rehearsal / Setup</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: DAY_TYPE_COLORS.main_event.backgroundColor }} />
            <span className="text-xs text-muted-foreground">Main Event</span>
          </div>
        </div>
      </div>

      <FullCalendar
        datesSet={handleDatesSet}
        editable={false}
        eventClick={handleEventClick}
        events={calendarEvents}
        headerToolbar={{
          center: 'title',
          left: 'prev,next today',
          right: 'dayGridMonth,timeGridWeek,listWeek',
        }}
        height="auto"
        initialView="dayGridMonth"
        nowIndicator
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
        ref={calendarRef}
        selectable={false}
      />

      <BookingDetailPopover
        event={selectedEvent}
        isLoggedIn={isLoggedIn}
        onOpenChange={setDialogOpen}
        open={dialogOpen}
      />
    </div>
  )
}
