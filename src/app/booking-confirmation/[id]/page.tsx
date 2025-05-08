"use client";

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils"
import { supabase } from "@/lib/supabase/client"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

interface Booking {
  end_time: string;
  id: string;
  room_name: string;
  start_time: string;
  status: string;
}

export default function BookingConfirmation() {
  const { id } = useParams();
  const [booking, setBooking] = useState<Booking | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function fetchBooking() {
      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single<Booking>();

        if (error) console.log(error)

      setBooking(data);
    }

    void fetchBooking();
  }, [id]);

  if (!booking) return <p>loading...</p>;

  return (
    <div className="flex mt-6 self-start px-4">
      <Card className="m-auto">
        <CardContent className="md:m-6 justify-items-center">
          <div className="text-center my-6">
            <h2 className="text-2xl font-bold mb-2">Booking Submitted!</h2>
            <p className="text-muted-foreground">
              Your booking request has been submitted and is pending approval.
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 gap-x-8 text-center md:text-left">
            <div>
              <h3 className="font-bold">Room</h3>
              <p>{booking.room_name}</p>
            </div>
            <div>
              <h3 className="font-bold">Date</h3>
              <p>{formatBookingDate(booking.start_time)}</p>
            </div>
            <div>
              <h3 className="font-bold">Time</h3>
              <p>
                {formatBookingTime(booking.start_time)} -{" "}
                {formatBookingTime(booking.end_time)}
              </p>
            </div>
            <div>
              <h3 className="font-bold">Status</h3>
              <p>{booking.status}</p>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <Button onClick={() => {router.push("/bookings")}}>
              View My Bookings
            </Button>
            <Button onClick={() => {router.push("/")}} variant="outline">
              Make another booking
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
