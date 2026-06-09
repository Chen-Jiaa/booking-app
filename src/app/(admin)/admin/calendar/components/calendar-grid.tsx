"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { addDays, format, isSameDay, setHours, startOfDay } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { Fragment } from "react";

import { type CalendarBooking } from "../actions/fetch-week-bookings";
import { BookingPopover } from "./booking-popover";
import { CreateBookingPopover } from "./create-booking-popover";

interface CalendarGridProps {
  bookings: CalendarBooking[];
  rooms: Room[];
  weekStart: Date;
}

interface Room {
  id: string;
  name: string;
}

const TIMEZONE = "Asia/Kuala_Lumpur";
const HOURS = Array.from({ length: 16 }, (_, i) => i + 8); // 8am to 11pm

export function CalendarGrid({
  bookings,
  rooms,
  weekStart,
}: CalendarGridProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-20 sticky left-0 bg-background z-10">
              Time
            </TableHead>
            {rooms.map((room) => (
              <TableHead className="min-w-32 text-center" key={room.id}>
                {room.name}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {weekDays.map((day) => (
            <Fragment key={day.toISOString()}>
              <TableRow className="bg-muted/50">
                <TableCell
                  className="font-semibold sticky left-0 bg-muted/50"
                  colSpan={rooms.length + 1}
                >
                  {format(day, "EEEE, MMM d")}
                </TableCell>
              </TableRow>
              {HOURS.map((hour) => (
                <TableRow key={`${day.toISOString()}-${hour.toString()}`}>
                  <TableCell className="text-sm text-muted-foreground sticky left-0 bg-background">
                    {format(setHours(new Date(), hour), "h a")}
                  </TableCell>
                  {rooms.map((room) => {
                    const booking = getBookingForCell(
                      bookings,
                      room.id,
                      day,
                      hour,
                    );
                    const isToday = isSameDay(day, new Date());

                    if (booking) {
                      return (
                        <TableCell className="p-1" key={room.id}>
                         <BookingPopover booking={booking}>
                           <button
                             className={cn(
                               "w-full h-10 rounded border text-xs px-1 truncate cursor-pointer transition-colors",
                               getStatusColor(booking.status),
                             )}
                             type="button"
                           >
                              {booking.name}
                            </button>
                          </BookingPopover>
                        </TableCell>
                      );
                    }

                    return (
                      <TableCell className="p-1" key={room.id}>
                        <CreateBookingPopover
                          prefilledDate={day}
                          prefilledHour={hour}
                          roomId={room.id}
                          roomName={room.name}
                        >
                          <button
                            className={cn(
                              "w-full h-10 rounded border border-border bg-muted/50 hover:bg-muted cursor-pointer transition-colors",
                              isToday && "border-info/30 bg-info/10",
                            )}
                            type="button"
                          />
                        </CreateBookingPopover>
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function getBookingForCell(
  bookings: CalendarBooking[],
  roomId: string,
  date: Date,
  hour: number,
): CalendarBooking | null {
  const cellStart = setHours(startOfDay(date), hour);
  const cellEnd = setHours(startOfDay(date), hour + 1);

  return (
    bookings.find((booking) => {
      if (booking.roomId !== roomId) return false;
      const bookingStart = toZonedTime(booking.startTime, TIMEZONE);
      const bookingEnd = toZonedTime(booking.endTime, TIMEZONE);
      return bookingStart < cellEnd && bookingEnd > cellStart;
    }) ?? null
  );
}

function getStatusColor(status: string) {
  switch (status) {
    case "confirmed": {
      return "bg-success/15 hover:bg-success/25 border-success/40";
    }
    case "pending": {
      return "bg-warning/15 hover:bg-warning/25 border-warning/40";
    }
    case "rejected": {
      return "bg-error/15 hover:bg-error/25 border-error/40";
    }
    default: {
      return "bg-muted";
    }
  }
}
