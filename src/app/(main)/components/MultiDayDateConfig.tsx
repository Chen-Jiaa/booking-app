'use client'

import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { generateTimeSlots } from "@/lib/date-utils"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

import { getUnavailableSlots } from "../actions/getUnavailableSlots"

export interface DayConfig {
  date: Date
  dayType: 'main_event' | 'rehearsal_setup'
  endTime: string | undefined
  isAllDay: boolean
  startTime: string | undefined
}

interface MultiDayDateConfigProps {
  dayConfigs: DayConfig[]
  excludeBookingId?: number
  onChange: (configs: DayConfig[]) => void
  roomId: string
}

export default function MultiDayDateConfig({
  dayConfigs,
  excludeBookingId,
  onChange,
  roomId,
}: MultiDayDateConfigProps) {
  const timeSlots = generateTimeSlots()
  const [unavailableByDay, setUnavailableByDay] = useState<
    Map<string, Set<string>>
  >(() => new Map())
  const [loadingDays, setLoadingDays] = useState<Set<string>>(() => new Set())

  // Fetch unavailable slots for each day when days or room changes
  useEffect(() => {
    let cancelled = false

    const fetchAll = async () => {
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Kuala_Lumpur"
      const dayKeys = dayConfigs.map((d) => d.date.toISOString())
      setLoadingDays(new Set(dayKeys))

      const results = await Promise.all(
        dayConfigs.map(async (day) => {
          const key = day.date.toISOString()
          try {
            const slots = await getUnavailableSlots(roomId, day.date, timezone, excludeBookingId)
            return { key, slots }
          } catch {
            return { key, slots: new Set<string>() }
          }
        }),
      )

      if (cancelled) return

      const newMap = new Map<string, Set<string>>()
      for (const { key, slots } of results) {
        newMap.set(key, slots)
      }
      setUnavailableByDay(newMap)
      setLoadingDays(new Set())
    }

    if (dayConfigs.length > 0) {
      void fetchAll()
    }

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-fetch only when day count or room changes
  }, [dayConfigs.length, roomId, excludeBookingId])

  const updateDay = (index: number, updates: Partial<DayConfig>) => {
    const newConfigs = [...dayConfigs]
    newConfigs[index] = { ...newConfigs[index], ...updates }
    onChange(newConfigs)
  }

  const getAvailableEndTimes = (dayKey: string, startTime: string) => {
    const unavailable = unavailableByDay.get(dayKey) ?? new Set<string>()
    const startIdx = timeSlots.indexOf(startTime)
    if (startIdx === -1) return []

    const endTimes: string[] = []
    for (let i = startIdx + 1; i < timeSlots.length; i++) {
      if (unavailable.has(timeSlots[i - 1])) break
      endTimes.push(timeSlots[i])
    }
    return endTimes
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="font-medium text-lg mb-4">Configure Each Day</h3>
        <div className="space-y-4">
          {dayConfigs.map((day, index) => {
            const dayKey = day.date.toISOString()
            const isLoading = loadingDays.has(dayKey)
            const unavailable = unavailableByDay.get(dayKey) ?? new Set<string>()
            const hasConflicts = unavailable.size > 0

            return (
              <div className="border rounded-lg p-4 space-y-3" key={dayKey}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">
                    {format(day.date, "EEEE, MMM d, yyyy")}
                  </div>
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                  {!isLoading && hasConflicts && (
                    <Badge variant="secondary">Some slots occupied</Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={day.isAllDay}
                    id={`allday-${dayKey}`}
                    onCheckedChange={(checked) => {
                      updateDay(index, {
                        endTime: checked ? undefined : day.endTime,
                        isAllDay: checked === true,
                        startTime: checked ? undefined : day.startTime,
                      })
                    }}
                  />
                  <Label htmlFor={`allday-${dayKey}`}>All Day</Label>
                </div>

                {!day.isAllDay && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Start Time</Label>
                      <Select
                        onValueChange={(value) => {
                          updateDay(index, {
                            endTime: undefined,
                            startTime: value,
                          })
                        }}
                        value={day.startTime ?? ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Start" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem
                              disabled={unavailable.has(slot)}
                              key={slot}
                              value={slot}
                            >
                              {slot}
                              {unavailable.has(slot) ? " (occupied)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">End Time</Label>
                      <Select
                        disabled={!day.startTime}
                        onValueChange={(value) => {
                          updateDay(index, { endTime: value })
                        }}
                        value={day.endTime ?? ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="End" />
                        </SelectTrigger>
                        <SelectContent>
                          {day.startTime &&
                            getAvailableEndTimes(dayKey, day.startTime).map(
                              (slot) => (
                                <SelectItem key={slot} value={slot}>
                                  {slot}
                                </SelectItem>
                              ),
                            )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                )}

                <div>
                  <Label className="text-xs">Day Type</Label>
                  <Select
                    onValueChange={(value: 'main_event' | 'rehearsal_setup') => {
                      updateDay(index, { dayType: value })
                    }}
                    value={day.dayType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="rehearsal_setup">
                        Rehearsal / Setup
                      </SelectItem>
                      <SelectItem value="main_event">Main Event Day</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
