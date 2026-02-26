'use client'

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { addDays, format, isSameDay } from "date-fns"
import { toZonedTime } from "date-fns-tz"

import { type CalendarBooking } from "../actions/fetch-week-bookings"
import { BookingPopover } from "./booking-popover"

interface CalendarListProps {
  bookings: CalendarBooking[]
  weekStart: Date
}

const TIMEZONE = "Asia/Kuala_Lumpur"

function formatTime(date: Date) {
  return format(toZonedTime(date, TIMEZONE), "h:mm a")
}

function getStatusStyles(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-green-100 text-green-800"
    case "pending":
      return "bg-orange-100 text-orange-800"
    case "rejected":
      return "bg-red-100 text-red-800"
    default:
      return "bg-gray-100 text-gray-800"
  }
}

export function CalendarList({ bookings, weekStart }: CalendarListProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const getBookingsForDay = (day: Date) => {
    return bookings.filter((booking) => {
      const bookingStart = toZonedTime(booking.startTime, TIMEZONE)
      const bookingEnd = toZonedTime(booking.endTime, TIMEZONE)
      const dayStart = day
      const dayEnd = addDays(day, 1)
      return bookingStart < dayEnd && bookingEnd > dayStart
    })
  }

  return (
    <div className="space-y-6">
      {weekDays.map((day) => {
        const dayBookings = getBookingsForDay(day)
        const isToday = isSameDay(day, new Date())

        return (
          <div key={day.toISOString()}>
            <h3
              className={cn(
                "text-lg font-semibold mb-3 pb-2 border-b",
                isToday && "text-blue-600"
              )}
            >
              {format(day, "EEEE, MMM d")}
              {isToday && <span className="ml-2 text-sm font-normal">(Today)</span>}
            </h3>

            {dayBookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bookings</p>
            ) : (
              <div className="space-y-2">
                {dayBookings.map((booking) => (
                  <BookingPopover booking={booking} key={booking.id}>
                    <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                {formatTime(booking.startTime)} - {formatTime(booking.endTime)}
                              </span>
                              <Badge className={cn("text-xs", getStatusStyles(booking.status))}>
                                {booking.status}
                              </Badge>
                            </div>
                            <p className="font-semibold truncate">{booking.roomName}</p>
                            <p className="text-sm text-muted-foreground truncate">
                              {booking.purpose} · {booking.name}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </BookingPopover>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
