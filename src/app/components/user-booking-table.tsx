'use client'

import { useSupabase } from "@/components/providers/supabase-providers"
import { AlertDialog, AlertDialogFooter, AlertDialogHeader, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger, AlertDialogAction } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils"
import { supabase } from "@/lib/supabase/client"
import { format } from "date-fns"
import { Circle, X } from "lucide-react"
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
        <div className="mt-4 px-6 md:max-w-[720px] w-full flex-col justify-self-center">
            <h2 className="font-bold mt-2">My Bookings</h2>
            <div className="space-y-4 mt-4 w-full">
                
            {bookings.map((booking) => {
                const start = formatBookingTime(booking.start_time)
                const end = formatBookingTime(booking.end_time)
                const dateFormatted = formatBookingDate(booking.start_time)

                return (
                    <Card key={booking.id}>
                        <CardContent className="pt-4 pb-4 flex flex-col gap-2">
                            
                            <div className="flex items-center justify-between w-full">
                                <p className="text-muted-foreground text-xs">Booked on {format(new Date(booking.created_at), "dd MMMM yyyy")}</p>
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
                                    <p className="font-semibold">{booking.room_name}</p>
                                </div>
                                <p className="text-sm md:text-sm">{dateFormatted} | {start} - {end}</p>
                            </div> 
                            
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="text-red-700 gap-1 mt-2"><X />Cancel booking</Button>
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
                                    <AlertDialogAction onClick={() => cancelBooking(booking.id)} className="bg-red-600">Continue</AlertDialogAction>
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