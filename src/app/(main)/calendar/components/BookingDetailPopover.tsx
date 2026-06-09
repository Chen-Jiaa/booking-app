'use client'

import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { format, parseISO } from "date-fns"
import { toZonedTime } from "date-fns-tz"

import { type CalendarEvent } from "../actions/fetchCalendarBookings"
import { DAY_TYPE_COLORS, DAY_TYPE_LABELS } from "../constants"

const TIMEZONE = "Asia/Kuala_Lumpur"

const STATUS_STYLES: Record<string, string> = {
  confirmed: "bg-success-bg text-success",
  pending: "bg-warning-bg text-warning",
}

interface BookingDetailPopoverProps {
  event: CalendarEvent | null
  isLoggedIn: boolean
  onOpenChange: (open: boolean) => void
  open: boolean
}

export function BookingDetailPopover({ event, isLoggedIn, onOpenChange, open }: BookingDetailPopoverProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event?.roomName}</DialogTitle>
          <DialogDescription>
            {event ? DAY_TYPE_LABELS[event.dayType] : ''}
          </DialogDescription>
        </DialogHeader>
        {event && (
          <EventDetail event={event} isLoggedIn={isLoggedIn} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function EventDetail({ event, isLoggedIn }: { event: CalendarEvent; isLoggedIn: boolean }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Badge className={cn(STATUS_STYLES[event.status])}>
          {event.status}
        </Badge>
        <Badge
          style={{
            backgroundColor: DAY_TYPE_COLORS[event.dayType].backgroundColor,
            color: DAY_TYPE_COLORS[event.dayType].textColor,
          }}
        >
          {DAY_TYPE_LABELS[event.dayType]}
        </Badge>
      </div>

      <div className="space-y-2 text-sm">
        <div>
          <span className="font-medium">Room:</span> {event.roomName}
        </div>
        <div>
          <span className="font-medium">Start:</span>{' '}
          {formatDateTime(event.start, event.allDay)}
        </div>
        {!event.allDay && (
          <div>
            <span className="font-medium">End:</span>{' '}
            {formatDateTime(event.end, false)}
          </div>
        )}

        {isLoggedIn ? (
          <>
            {event.eventName && (
              <div>
                <span className="font-medium">Event:</span> {event.eventName}
              </div>
            )}
            {event.clientName && (
              <div>
                <span className="font-medium">Client:</span> {event.clientName}
              </div>
            )}
            {event.picName && (
              <div>
                <span className="font-medium">PIC:</span> {event.picName}
              </div>
            )}
            {event.picPhone && (
              <div>
                <span className="font-medium">Phone:</span> {event.picPhone}
              </div>
            )}
            {event.purpose && (
              <div>
                <span className="font-medium">Purpose:</span> {event.purpose}
              </div>
            )}
            {event.expectedAttendance != null && (
              <div>
                <span className="font-medium">Expected Attendance:</span>{' '}
                {event.expectedAttendance}
              </div>
            )}
          </>
        ) : (
          <p className="italic text-muted-foreground">
            Log in to view booking details.
          </p>
        )}
      </div>
    </div>
  )
}

function formatDateTime(isoString: string, allDay: boolean): string {
  if (allDay) return 'All Day'
  try {
    const date = toZonedTime(parseISO(isoString), TIMEZONE)
    return format(date, "EEE, MMM d · h:mm a")
  } catch {
    return isoString
  }
}
