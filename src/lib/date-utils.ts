import { format } from "date-fns";

import { interval, room_endHour, room_startHour } from "./config";

export function combineDateAndTime(date: Date, time: string) {
  
  const [hours, minutes] = time.split(":").map(Number);

  const combined = new Date(date);
  combined.setHours(hours);
  combined.setMinutes(minutes);
  combined.setSeconds(0);
  combined.setMilliseconds(0);

  return combined;
}



export function formatBookingDate(timestamp: string) {
  const date = new Date(timestamp);
  return format(date, "EE, MMM d, yyyy");
}



export function formatBookingTime(timestamp: string) {
  const date = new Date(timestamp);
  return format(date, "p"); // p = localized time, like 2:00 PM
}



export function generateTimeSlots() {
  const slots = [];

  for (let i = room_startHour; i <= room_endHour; i += interval / 60) {
    const hour = Math.floor(i);
    const minutes = i % 1 === 0 ? "00" : "30";
    slots.push(`${hour.toString().padStart(2, "0")}:${minutes}`);
  }

  return slots;
}