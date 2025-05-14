'use client'

import { useSupabase } from "@/components/providers/supabase-providers"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { combineDateAndTime } from "@/lib/date-utils"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { submitBooking } from "../actions/submitBooking"

interface BookingFormProps {
    date: Date
    endTime: string
    selectedRoom: {id: string; name: string}
    startTime: string
}

const formSchema = z.object({
    email: z.string().email("Enter a valid email"),
    name: z.string().min(2, "Name is required"),
    phone: z.string().min(7, "Enter a valid phone number"),
    purpose: z.string().min(1, "Please select a purpose"),
})

const purposeOptions = [
    { label: "Connect Group", value: "connect_group" },
    { label: "Combine Connect Group", value: "combine_connect_group" },
    { label: "Bible Study", value: "bible_study" },
    { label: "Prayer Meeting", value: "prayer_meeting" },
    { label: "Zone Meeting", value: "zone_meeting" },
    { label: "Practice (Email Admin for approval)", value: "practice" },
    { label: "Event (Email Admin for approval)", value: "event" },
    { label: "Others", value: "others" },
]
    
export default function BookingForm2({
    date, endTime, selectedRoom, startTime
}: BookingFormProps) {
    
    const form = useForm<z.infer<typeof formSchema>>({
        defaultValues: {
          email: "",
          name: "",
          phone: "",
          purpose: "",
        },
        resolver: zodResolver(formSchema),
      })
    const [isLoading, setIsLoading] = useState(false)
    const { user } = useSupabase()
    const router = useRouter()

    async function onSubmit (values: z.infer<typeof formSchema>) {
        setIsLoading(true)
        const fullStartTime = combineDateAndTime(date, startTime).toISOString()
        const fullEndTime = combineDateAndTime(date, endTime).toISOString()
            
        try {
            const booking = await submitBooking({
                ...values,
                fullEndTime,
                fullStartTime,
                selectedRoomId: selectedRoom.id,
                selectedRoomName: selectedRoom.name,
                userId: user?.id,
            })

            form.reset()
            
            router.push(`/booking-confirmation/${booking.id}`)
        } catch (error) {
            console.error("Booking failed:", error)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Form {...form}>
            <form 
                className="grid grid-cols-1 gap-4" 
                onSubmit={form.handleSubmit(onSubmit) as unknown as () => void}
            >
                <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Name:</FormLabel>
                            <FormControl>
                                <Input placeholder="Your Full Name" {...field} />
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
                            <FormLabel>Email:</FormLabel>
                            <FormControl>
                                <Input placeholder="Your e-mail" {...field} type="email"/>
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
                            <FormLabel>Phone:</FormLabel>
                            <FormControl>
                                <Input placeholder="Your phone number" {...field} type="tel"/>
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
                            <FormLabel>Purpose of Booking:</FormLabel>
                            <Select defaultValue={field.value} onValueChange={field.onChange}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select a purpose for booking" />
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

                <Button disabled={isLoading} type="submit">
                    {isLoading ? (
                        <>
                            <Loader2 className="animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        "Submit Booking"
                    )}
                </Button>
            </form>
        </Form>
    )
}