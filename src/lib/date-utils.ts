import { format } from "date-fns";

export function formatBookingDate(timestamp: string) {
  const date = new Date(timestamp);
  return format(date, "EE, MMM d, yyyy");
}

export function formatBookingTime(timestamp: string) {
  const date = new Date(timestamp);
  return format(date, "p"); // p = localized time, like 2:00 PM
}
