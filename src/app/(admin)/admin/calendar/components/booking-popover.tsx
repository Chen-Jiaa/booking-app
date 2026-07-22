"use client";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { type ReactNode } from "react";

import { type CalendarBooking } from "../actions/fetch-week-bookings";

interface BookingPopoverProps {
  booking: CalendarBooking;
  children: ReactNode;
}

const TIMEZONE = "Asia/Kuala_Lumpur";

export function BookingPopover({ booking, children }: BookingPopoverProps) {
  const statusStyles = {
    confirmed: "bg-success-bg text-success",
    pending: "bg-warning-bg text-warning",
    rejected: "bg-error-bg text-error",
  };

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">{booking.roomName}</h4>
            <Badge className={cn(statusStyles[booking.status as keyof typeof statusStyles])}>
              {booking.status}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">Name:</span> {booking.name}
            </div>
            <div>
              <span className="font-medium">Email:</span> {booking.email}
            </div>
            <div>
              <span className="font-medium">Phone:</span> {booking.phone}
            </div>
            <div>
              <span className="font-medium">Purpose:</span> {booking.purpose}
            </div>
            <div>
              <span className="font-medium">Time:</span> {formatDate(booking.startTime)}{" "}
              {formatTime(booking.startTime)} - {formatDate(booking.endTime)}{" "}
              {formatTime(booking.endTime)}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatDate(date: Date) {
  return format(toZonedTime(date, TIMEZONE), "EEE, MMM d");
}

function formatTime(date: Date) {
  return format(toZonedTime(date, TIMEZONE), "h:mm a");
}
