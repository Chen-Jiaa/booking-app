'use client'

import { useSupabase } from "@/components/providers/supabase-providers"
import { AlertDialog, AlertDialogFooter, AlertDialogHeader, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils"
import { supabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { X } from "lucide-react"
import { useEffect, useState } from "react"

type Bookings = {
    id: string;
    name: string;
    email: string;
    phone: string;
    room_id: string;
    room_name: string;
    start_time: string;
    end_time: string;
    purpose: string;
    status: string;
    user_id: string;
    created_at: string;
  };

export function BookingsList() {
    const [bookings, setBookings] = useState<Bookings[]>([])
    const [fetchError, setFetchError] = useState<null | string>(null)
    const {user} = useSupabase()

    useEffect(() => {

        if (!user?.id) return
        
        const fetchBookings = async () => {
            const { data, error } = await supabase
            .from("bookings")
            .select("*")
            .eq("user_id", user.id)

            if (error) {
                setFetchError("Error loading bookings")
                setBookings([]);
                console.log(error);
            } else if (data) {
                const sortedBookings = [...data].sort(
                    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
                )
                setBookings(sortedBookings)
                setFetchError(null)
            }
        };

        fetchBookings();

    }, [user?.id]);

    const cancelBooking = async (id: string) => {
        const { error} = await supabase
        .from("bookings")
        .delete()
        .eq('id', id)
    
        if (error) {
        console.error("Error cancelling booking:", error);
        } else {
        setBookings((prev) => prev.filter((b) => b.id !== id)) 
        }
    }

      
    return (
        <div className="mt-4 px-4">
            <h2 className="font-bold">My Bookings</h2>
            <div className="space-y-4 mt-2">
                
            {bookings.map((booking) => {
                const start = formatBookingTime(booking.start_time)
                const end = formatBookingTime(booking.end_time)
                const dateFormatted = formatBookingDate(booking.start_time)

                return (
                <Card key={booking.id}>
                    <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                        
                        <div className="flex items-center justify-between w-full">
                            <p className="text-muted-foreground text-xs">Booked on {format(new Date(booking.created_at), "dd MMMM yyyy")}</p>
                            <span className={`text-xs md:text-sm capitalize rounded-[20px] border-solid border-[1px] px-4 text-muted-foreground
                                ${booking.status === "approved" ? "text-white bg-green-700 border-green-700" : ""}
                                ${booking.status === "rejected" ? "text-red-500 border-red-500" : ""}
                                `}>
                                {booking.status}
                            </span>
                            
                        </div>

                        <div>
                            <div className="flex justify-items-stretch">
                                <p className="font-semibold">{booking.room_name}</p>
                            </div>
                            <p className="text-sm md:text-sm">{dateFormatted} | {start} - {end}</p>
                        </div> 

                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline" className="text-muted-foreground gap-1"><X />Cancel booking</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will cancel your
                                    current booking.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => cancelBooking(booking.id)}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </CardContent>
                </Card>
                )
            })}
            </div>
        </div>
    )
}