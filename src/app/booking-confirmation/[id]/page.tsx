'use client'

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { format } from "date-fns"
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils";

type Booking = {
    id:string;
    room_name: string;
    start_time: string;
    end_time: string;
}

export default function BookingConfirmation () {
    const {id} = useParams()
    const [booking, setBooking] = useState<Booking | null>(null)
    const router = useRouter()

    useEffect(()=>{
        async function fetchBooking() {
            const {data, error} = await supabase
                .from ("bookings")
                .select ("*")
                .eq("id", id)
                .single()
            
            setBooking(data)
        }

        fetchBooking()
    },[id])

    if(!booking) return <p>loading...</p>

    return (
        <div className="flex m-6">
            <Card className="m-auto">
                <CardContent className="m-6 justify-items-center">
                    <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold mb-2">Booking Submitted!</h2>
                        <p className="text-muted-foreground">Your booking request has been submitted and is pending approval.</p>
                    </div>

                    <div className="mb-6 grid grid-cols-2 gap-4">
                        <div>
                            <h3 className="font-medium">Room</h3>
                            <p>{booking.room_name}</p>
                        </div>
                        <div>
                            <h3 className="font-medium">Date</h3>
                            <p>{formatBookingDate(booking.start_time)}</p>
                        </div>
                        <div>
                            <h3 className="font-medium">Time</h3>
                            <p>
                                {formatBookingTime(booking.start_time)} - {formatBookingTime(booking.end_time)}
                            </p>
                        </div>
                        <div>
                            <h3 className="font-medium">Status</h3>
                            <p>Pending Approval</p>
                        </div>
                    </div>

                    <div className="flex justify-center space-x-4">
                        <Button onClick={() => router.push("/bookings")}>View My Bookings</Button>
                        <Button variant="outline" onClick={() => router.push("/")}>
                        Back to Home
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}