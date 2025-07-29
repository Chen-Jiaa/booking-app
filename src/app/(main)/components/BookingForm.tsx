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
    customPurpose: z.string().optional(),
    email: z.string().email("Enter a valid email"),
    name: z.string().min(2, "Name is required"),
    phone: z.string().min(7, "Enter a valid phone number"),
    purpose: z.string().min(1, "Please select a purpose"),
})

const purposeOptions = [
    { label: "Connect Group", value: "Connect Group" },
    { label: "Combine Connect Group", value: "Combine Connect Group" },
    { label: "Bible Study", value: "Bible Study" },
    { label: "Prayer Meeting", value: "Prayer Meeting" },
    { label: "Zone Meeting", value: "Zone Meeting" },
    // { label: "Others", value: "others" },
]
    
export default function BookingForm2(props: BookingFormProps) {
    const { date, endTime, selectedRoom, startTime } = props
    
    const [selectedPurpose, setSelectedPurpose] = useState("")
    
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
        const finalPurpose = values.purpose === "others" && values.customPurpose
            ? values.customPurpose
            : values.purpose
            
        try {
            const booking = await submitBooking({
                ...values,
                fullEndTime,
                fullStartTime,
                purpose: finalPurpose,
                selectedRoomId: selectedRoom.id,
                selectedRoomName: selectedRoom.name,
                userId: user?.id,
            })

            router.push(`/booking-confirmation/${booking.id.toString()}`)
            
        } catch (error) {
            console.error("Booking failed:", error)
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
                            <Select 
                                defaultValue={field.value} 
                                onValueChange={(value) => {
                                    field.onChange(value)
                                    setSelectedPurpose(value)
                                }} 
                                value={selectedPurpose}
                            >
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

                {/* {selectedPurpose === "others" && (
                    <FormField
                        control={form.control}
                        name="customPurpose"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Please specify your purpose:</FormLabel>
                            <FormControl>
                                <Input placeholder="Enter your purpose" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                )} */}
                

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