'use client'

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { type BookingDays, type Bookings, type Rooms } from "@/db/schema"
import { generateTimeSlots } from "@/lib/date-utils"
import { eachDayOfInterval, format } from "date-fns"
import { toZonedTime } from "date-fns-tz"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { type DateRange } from "react-day-picker"
import { toast } from "sonner"

import { editMultiDayBooking, editStandardBooking } from "../actions/editBooking"
import { getUnavailableSlots } from "../actions/getUnavailableSlots"
import MultiDayDateConfig, { type DayConfig } from "./MultiDayDateConfig"

const TZ = 'Asia/Kuala_Lumpur'

const purposeOptions = [
  { label: "Connect Group", value: "Connect Group" },
  { label: "Combine Connect Group", value: "Combine Connect Group" },
  { label: "Bible Study", value: "Bible Study" },
  { label: "Prayer Meeting", value: "Prayer Meeting" },
  { label: "Zone Meeting", value: "Zone Meeting" },
]

interface EditBookingFormProps {
  booking: Bookings
  bookingDays: BookingDays[]
  rooms: Rooms[]
}

export default function EditBookingForm({ booking, bookingDays: initialBookingDays }: EditBookingFormProps) {
  const isMultiDay = booking.isMultiDay ?? false

  if (isMultiDay) {
    return <EditMultiDayForm booking={booking} bookingDays={initialBookingDays} />
  }

  return <EditStandardForm booking={booking} />
}

// --- Multi-Day Booking Edit Form ---

function EditMultiDayForm({ booking, bookingDays: initialDays }: { booking: Bookings; bookingDays: BookingDays[] }) {
  const router = useRouter()

  const [eventName, setEventName] = useState(booking.eventName ?? '')
  const [clientName, setClientName] = useState(booking.clientName ?? '')
  const [expectedAttendance, setExpectedAttendance] = useState(
    booking.expectedAttendance?.toString() ?? ''
  )

  const [sortedDays] = useState(() => {
    return [...initialDays].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    )
  })
  const firstDay = sortedDays[0] as typeof sortedDays[0] | undefined
  const lastDay = sortedDays.at(-1)

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => {
    if (!firstDay || !lastDay) return
    return {
      from: new Date(new Date(firstDay.date).setHours(0, 0, 0, 0)),
      to: new Date(new Date(lastDay.date).setHours(0, 0, 0, 0)),
    }
  })

  const [dayConfigs, setDayConfigs] = useState<DayConfig[]>(() => {
    return sortedDays.map((day) => {
      const localStart = day.startTime ? toZonedTime(new Date(day.startTime), TZ) : null
      const localEnd = day.endTime ? toZonedTime(new Date(day.endTime), TZ) : null
      return {
        date: new Date(new Date(day.date).setHours(0, 0, 0, 0)),
        dayType: day.dayType as 'main_event' | 'rehearsal_setup',
        endTime: localEnd ? format(localEnd, "HH:mm") : undefined,
        isAllDay: day.isAllDay ?? false,
        startTime: localStart ? format(localStart, "HH:mm") : undefined,
      }
    })
  })
  const [submitting, setSubmitting] = useState(false)

  const handleDateRangeChange = (range: DateRange | undefined) => {
    setDateRange(range)
    if (range?.from && range.to) {
      const days = eachDayOfInterval({ end: range.to, start: range.from })
      setDayConfigs(
        days.map((d) => {
          const existing = dayConfigs.find(
            (dc) => dc.date.toDateString() === d.toDateString()
          )
          return existing ?? {
            date: d,
            dayType: 'rehearsal_setup' as const,
            endTime: undefined,
            isAllDay: false,
            startTime: undefined,
          }
        })
      )
    }
  }

  const allDaysConfigured = dayConfigs.every(
    (day) => day.isAllDay || (day.startTime && day.endTime)
  )

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const result = await editMultiDayBooking({
        bookingId: booking.id,
        clientName,
        days: dayConfigs.map((day) => ({
          date: day.date.toISOString(),
          dayType: day.dayType,
          endTime: day.endTime,
          isAllDay: day.isAllDay,
          startTime: day.startTime,
        })),
        eventName,
        expectedAttendance: expectedAttendance ? Number.parseInt(expectedAttendance) : null,
      })

      if (result.success) {
        toast.success(
          result.datesChanged
            ? 'Booking updated. Dates/times changed — re-submitted for approval.'
            : 'Booking updated successfully.'
        )
        router.push('/bookings')
      } else {
        toast.error('error' in result ? result.error : 'Failed to update booking.')
      }
    } catch (error) {
      console.error('Edit failed:', error)
      toast.error('Failed to update booking.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Event Name</Label>
            <Input
              onChange={(e) => { setEventName(e.target.value) }}
              value={eventName}
            />
          </div>
          <div>
            <Label>Client Name</Label>
            <Input
              onChange={(e) => { setClientName(e.target.value) }}
              value={clientName}
            />
          </div>
          <div>
            <Label>Event Manager</Label>
            <Input className="bg-muted" readOnly value={booking.name} />
          </div>
          <div>
            <Label>Expected Attendance</Label>
            <Input
              onChange={(e) => { setExpectedAttendance(e.target.value) }}
              type="number"
              value={expectedAttendance}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Room</Label>
            <p className="font-medium">{booking.roomName}</p>
          </div>
          <div>
            <Label>Select Date Range</Label>
            <Calendar
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              mode="range"
              numberOfMonths={1}
              onSelect={handleDateRangeChange}
              selected={dateRange}
            />
            {dateRange?.from && dateRange.to && (
              <p className="text-sm text-muted-foreground mt-2">
                {format(dateRange.from, 'MMM d, yyyy')} —{' '}
                {format(dateRange.to, 'MMM d, yyyy')} (
                {eachDayOfInterval({ end: dateRange.to, start: dateRange.from }).length} days)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {dayConfigs.length > 0 && booking.roomId && (
        <MultiDayDateConfig
          dayConfigs={dayConfigs}
          excludeBookingId={booking.id}
          onChange={setDayConfigs}
          roomId={booking.roomId}
        />
      )}

      {allDaysConfigured && dayConfigs.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <h3 className="font-medium text-lg mb-4">Summary</h3>
            <div className="space-y-2 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Event:</span>
                <span className="font-medium">{eventName}</span>
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{clientName}</span>
                <span className="text-muted-foreground">Room:</span>
                <span className="font-medium">{booking.roomName}</span>
                {expectedAttendance !== '' && (
                  <>
                    <span className="text-muted-foreground">Attendance:</span>
                    <span className="font-medium">{expectedAttendance}</span>
                  </>
                )}
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left">Date</th>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {dayConfigs.map((day) => (
                    <tr className="border-t" key={day.date.toISOString()}>
                      <td className="px-3 py-2">{format(day.date, 'EEE, MMM d')}</td>
                      <td className="px-3 py-2">
                        {day.isAllDay
                          ? 'All Day'
                          : `${day.startTime ?? ''} – ${day.endTime ?? ''}`}
                      </td>
                      <td className="px-3 py-2">
                        {day.dayType === 'main_event' ? 'Main Event Day' : 'Rehearsal / Setup'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              className="w-full mt-4"
              disabled={submitting || !eventName || !clientName}
              onClick={() => { void handleSubmit() }}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : 'Save Changes'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- Standard Booking Edit Form ---

function EditStandardForm({ booking }: { booking: Bookings }) {
  const router = useRouter()
  const timeSlots = generateTimeSlots()

  const localStart = toZonedTime(new Date(booking.startTime), TZ)
  const localEnd = toZonedTime(new Date(booking.endTime), TZ)

  const [date, setDate] = useState<Date>(() => {
    const d = new Date(localStart)
    d.setHours(0, 0, 0, 0)
    return d
  })
  const [startTime, setStartTime] = useState(() => format(localStart, "HH:mm"))
  const [endTime, setEndTime] = useState(() => format(localEnd, "HH:mm"))
  const [name, setName] = useState(booking.name)
  const [email, setEmail] = useState(booking.email)
  const [phone, setPhone] = useState(booking.phone)
  const [purpose, setPurpose] = useState(booking.purpose)
  const [submitting, setSubmitting] = useState(false)
  const [unavailableSlots, setUnavailableSlots] = useState<Set<string>>(() => new Set())
  const [loadingSlots, setLoadingSlots] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchSlots() {
      if (!booking.roomId) return
      setLoadingSlots(true)
      try {
        const slots = await getUnavailableSlots(booking.roomId, date, TZ, booking.id)
        if (!cancelled) setUnavailableSlots(slots)
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoadingSlots(false)
      }
    }
    void fetchSlots()
    return () => { cancelled = true }
  }, [date, booking.roomId, booking.id])

  const getAvailableEndTimes = () => {
    const startIdx = timeSlots.indexOf(startTime)
    if (startIdx === -1) return []
    const ends: string[] = []
    for (let i = startIdx + 1; i < timeSlots.length; i++) {
      if (unavailableSlots.has(timeSlots[i - 1])) break
      ends.push(timeSlots[i])
    }
    return ends
  }

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      const newDate = new Date(selectedDate)
      newDate.setHours(0, 0, 0, 0)
      setDate(newDate)
      setStartTime('')
      setEndTime('')
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const [startH, startM] = startTime.split(':').map(Number)
      const fullStart = new Date(date)
      fullStart.setHours(startH, startM, 0, 0)

      const [endH, endM] = endTime.split(':').map(Number)
      const fullEnd = new Date(date)
      fullEnd.setHours(endH, endM, 0, 0)

      const result = await editStandardBooking({
        bookingId: booking.id,
        email,
        endTime: fullEnd.toISOString(),
        name,
        phone,
        purpose,
        startTime: fullStart.toISOString(),
      })

      if (result.success) {
        toast.success(
          result.datesChanged
            ? 'Booking updated. Date/time changed — re-submitted for approval.'
            : 'Booking updated successfully.'
        )
        router.push('/bookings')
      } else {
        toast.error('error' in result ? result.error : 'Failed to update booking.')
      }
    } catch (error) {
      console.error('Edit failed:', error)
      toast.error('Failed to update booking.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Room</Label>
            <p className="font-medium">{booking.roomName}</p>
          </div>

          <div>
            <Label>Select Date</Label>
            <Calendar
              disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
              mode="single"
              onSelect={handleDateSelect}
              selected={date}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time</Label>
              <Select
                onValueChange={(v) => { setStartTime(v); setEndTime('') }}
                value={startTime}
              >
                <SelectTrigger><SelectValue placeholder="Start" /></SelectTrigger>
                <SelectContent>
                  {loadingSlots ? (
                    <div className="p-2 text-center">
                      <Loader2 className="h-4 w-4 animate-spin inline" />
                    </div>
                  ) : (
                    timeSlots.map((slot) => (
                      <SelectItem
                        disabled={unavailableSlots.has(slot)}
                        key={slot}
                        value={slot}
                      >
                        {slot}{unavailableSlots.has(slot) ? ' (occupied)' : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>End Time</Label>
              <Select
                disabled={!startTime}
                onValueChange={setEndTime}
                value={endTime}
              >
                <SelectTrigger><SelectValue placeholder="End" /></SelectTrigger>
                <SelectContent>
                  {startTime && getAvailableEndTimes().map((slot) => (
                    <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              onChange={(e) => { setName(e.target.value) }}
              value={name}
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              onChange={(e) => { setEmail(e.target.value) }}
              type="email"
              value={email}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              onChange={(e) => { setPhone(e.target.value) }}
              type="tel"
              value={phone}
            />
          </div>
          <div>
            <Label>Purpose</Label>
            <Select onValueChange={setPurpose} value={purpose}>
              <SelectTrigger><SelectValue placeholder="Select purpose" /></SelectTrigger>
              <SelectContent>
                {purposeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Button
        className="w-full"
        disabled={!startTime || !endTime || !name || !email || !phone || !purpose || submitting}
        onClick={() => { void handleSubmit() }}
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : 'Save Changes'}
      </Button>
    </div>
  )
}
