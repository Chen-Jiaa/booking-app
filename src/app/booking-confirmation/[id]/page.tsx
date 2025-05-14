export const dynamic = "force-dynamic"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils"
import Link from "next/link";

import fetchBookings from "./actions"

interface PageProps {
  params: Promise<{id: string}>
}

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

export default async function BookingConfirmation({ params }: PageProps) {
  
  const { id } = await params

  if (!id) {
    return <p className="text-center mt-10">No booking ID found.</p>
  }

  const booking = await fetchBookings(id)
  
  if (!booking) {
    return <p className="text-center mt-10">Failed to load booking</p>
  }

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
              <h3 className="font-bold">Purpose</h3>
              <p>
                {getPurposeLabel(booking.purpose)}
              </p>
            </div>
            <div>
              <h3 className="font-bold">Status</h3>
              <p>{booking.status}</p>
            </div>
          </div>

          <div className="flex justify-center space-x-4">
            <Button asChild>
              <Link href="/bookings">View My Bookings</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/">Make another booking</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getPurposeLabel (value: string) {
  const option = purposeOptions.find((opt) => opt.value === value)
  return option?.label ?? value
}
