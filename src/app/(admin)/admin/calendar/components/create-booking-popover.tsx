'use client'

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, Loader2 } from "lucide-react"
import { type ReactNode, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { createAdminBooking } from "../actions/create-booking"

interface CreateBookingPopoverProps {
  children: ReactNode
  prefilledDate?: Date
  prefilledHour?: number
  roomId: string
  roomName: string
}

const timeSlots = Array.from({ length: 16 }, (_, i) => {
  const hour = i + 8
  return `${hour.toString().padStart(2, "0")}:00`
})

const purposeOptions = [
  { label: "Connect Group", value: "Connect Group" },
  { label: "Combine Connect Group", value: "Combine Connect Group" },
  { label: "Bible Study", value: "Bible Study" },
  { label: "Prayer Meeting", value: "Prayer Meeting" },
  { label: "Zone Meeting", value: "Zone Meeting" },
]

const formSchema = z.object({
  email: z.string().email("Enter a valid email"),
  endDate: z.date(),
  endTime: z.string(),
  name: z.string().min(2, "Name is required"),
  phone: z.string().min(7, "Enter a valid phone number"),
  purpose: z.string().min(1, "Please select a purpose"),
  startDate: z.date(),
  startTime: z.string(),
  status: z.enum(["pending", "confirmed"]),
})

export function CreateBookingPopover({
  children,
  prefilledDate,
  prefilledHour,
  roomId,
  roomName,
}: CreateBookingPopoverProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const defaultStartTime = prefilledHour === undefined
    ? "08:00"
    : `${prefilledHour.toString().padStart(2, "0")}:00`
  const defaultEndTime = prefilledHour === undefined
    ? "09:00"
    : `${(prefilledHour + 1).toString().padStart(2, "0")}:00`

  const form = useForm<z.infer<typeof formSchema>>({
    defaultValues: {
      email: "",
      endDate: prefilledDate ?? new Date(),
      endTime: defaultEndTime,
      name: "",
      phone: "",
      purpose: "",
      startDate: prefilledDate ?? new Date(),
      startTime: defaultStartTime,
      status: "confirmed",
    },
    resolver: zodResolver(formSchema),
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true)
    try {
      const startDateTime = new Date(values.startDate)
      const [startHour, startMin] = values.startTime.split(":").map(Number)
      startDateTime.setHours(startHour, startMin, 0, 0)

      const endDateTime = new Date(values.endDate)
      const [endHour, endMin] = values.endTime.split(":").map(Number)
      endDateTime.setHours(endHour, endMin, 0, 0)

      await createAdminBooking({
        email: values.email,
        endTime: endDateTime.toISOString(),
        name: values.name,
        phone: values.phone,
        purpose: values.purpose,
        roomId,
        startTime: startDateTime.toISOString(),
        status: values.status,
      })

      form.reset()
      setOpen(false)
    } catch (error) {
      console.error("Failed to create booking:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-96 max-h-[80vh] overflow-y-auto">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold">Create Booking</h4>
            <p className="text-sm text-muted-foreground">{roomName}</p>
          </div>

          <Form {...form}>
            <form className="space-y-3" onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              className="w-full pl-3 text-left font-normal"
                              variant="outline"
                            >
                              {format(field.value, "MMM d")}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <Calendar
                            mode="single"
                            onSelect={field.onChange}
                            selected={field.value}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              className="w-full pl-3 text-left font-normal"
                              variant="outline"
                            >
                              {format(field.value, "MMM d")}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto p-0">
                          <Calendar
                            mode="single"
                            onSelect={field.onChange}
                            selected={field.value}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {timeSlots.map((slot) => (
                            <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="email@example.com" type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="Phone number" type="tel" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purpose"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purpose</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select purpose" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {purposeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button className="w-full" disabled={isLoading} type="submit">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Booking"
                )}
              </Button>
            </form>
          </Form>
        </div>
      </PopoverContent>
    </Popover>
  )
}
