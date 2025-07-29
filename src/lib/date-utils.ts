import { format } from "date-fns"
import {toZonedTime} from "date-fns-tz"

import { interval, room_endHour, room_startHour } from "./config"

export function combineDateAndTime(date: Date, time: string) {
  
  const [hours, minutes] = time.split(":").map(Number)

  const combined = new Date(date)
  combined.setHours(hours)
  combined.setMinutes(minutes)
  combined.setSeconds(0)
  combined.setMilliseconds(0)

  return combined
}


export function formatBookingDate(timestamp: Date) {
  const date = new Date(timestamp)
  const malaysiaTimeZone = 'Asia/Kuala_Lumpur'
  const localTime = toZonedTime(date, malaysiaTimeZone)
  return format(localTime, "EE, MMM d")
}



export function formatBookingTime(timestamp: Date) {
  const date = new Date(timestamp)
  const malaysiaTimeZone = 'Asia/Kuala_Lumpur'
  const localTime = toZonedTime(date, malaysiaTimeZone)
  return format(localTime, "p")
}



export function generateTimeSlots() {
  const slots = []

  for (let i = room_startHour; i <= room_endHour; i += interval / 60) {
    const hour = Math.floor(i)
    const minutes = i % 1 === 0 ? "00" : "30"
    slots.push(`${hour.toString().padStart(2, "0")}:${minutes}`)
  }

  return slots
}