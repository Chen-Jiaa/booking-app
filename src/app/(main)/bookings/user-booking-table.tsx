'use client'

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Bookings } from "@/db/schema"
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils"
import { format } from "date-fns"
import { Circle, X } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { cancelUserBooking } from "./actions"

interface BookingListProps {
    bookings: Bookings[]
}

export function BookingsList({bookings: initialBookings} : BookingListProps) {
    const [bookings, setBookings] = useState<Bookings[]>(initialBookings)

    const cancelBooking = async (id: number) => {
        setBookings((prev) => prev.filter((b) => b.id !== id))
        try {
            await cancelUserBooking(id)
        } catch (error) {
            console.error("Failed to cancel booking:", error)
        }
    }

    return (
        <div className="mt-4 px-6 md:max-w-[720px] w-full flex-col justify-self-center">
            
            {bookings.length === 0 ? (
                <div className="text-center mt-8">
                <p className="text-muted-foreground mb-4">You haven’t made any bookings yet.</p>
                <Button asChild>
                  <Link className="text-white" href="/">Make a Booking</Link>
                </Button>
              </div>
            ):(
                <>
                    <h2 className="font-bold mt-2">My Bookings</h2>
                    <div className="space-y-4 mt-4 w-full">
                    {bookings.map((booking) => {
                        const start = formatBookingTime(booking.startTime)
                        const end = formatBookingTime(booking.endTime)
                        const dateFormatted = formatBookingDate(booking.startTime)
        
                        return (
                            <Card key={booking.id}>
                                <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                                    
                                    <div className="flex items-center justify-between w-full">
                                        <p className="text-muted-foreground text-xs">Booked on {format(new Date(booking.createdAt), "dd MMMM yyyy")}</p>
                                        <div className={`text-xs md:text-sm capitalize rounded-[20px] px-3 text-muted-foreground border-[1px] flex items-center gap-1
                                            ${booking.status === "confirmed" ? " text-green-700 bg-green-50 border-0" : ""}
                                            ${booking.status === "rejected" ? "text-red-700 bg-red-50 border-0" : ""}
                                            `}>
                                            <Circle className="w-[10px] fill-current"/>
                                            {booking.status}
                                        </div>
                                        
                                    </div>
        
                                    <div>
                                        <div className="flex justify-items-stretch">
                                            <p className="font-semibold">{booking.roomName}</p>
                                        </div>
                                        <p className="text-sm md:text-sm">{dateFormatted} | {start} - {end}</p>
                                    </div> 
                                    
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button className="text-red-700 gap-1 mt-2" variant="outline"><X />Cancel booking</Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="w-[80%] rounded-md">
                                            <AlertDialogHeader>
                                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will cancel your
                                                current booking.
                                            </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction className="bg-red-600" onClick={() => void cancelBooking(booking.id)}>Continue</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </CardContent>
                            </Card>
                        )
                        
                    })}
                    </div>
                </>
            )}
            
            
        </div>
    )
}