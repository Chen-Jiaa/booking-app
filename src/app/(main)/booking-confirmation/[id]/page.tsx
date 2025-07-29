export const dynamic = "force-dynamic"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/db"
import { bookings } from "@/db/schema"
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils"
import { getPurposeLabel } from "@/lib/getPurposeLabel"
import { eq } from "drizzle-orm"
import { CircleCheckBig, Hourglass } from "lucide-react"
import Link from "next/link"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function BookingConfirmation({ params }: PageProps) {
  const { id: idParam } = await params
  const id = Number(idParam)

  if (Number.isNaN(id)) {
    return <p className="text-center mt-10">No booking ID found.</p>
  }

  const result = await db
    .select()
    .from(bookings)
    .where(eq(bookings.id,id))
    .limit(1)

  const booking = result[0] as typeof result[0] | undefined

  if (!booking) {
    return <p className="text-center mt-10">Failed to load booking.</p>
  }

  return (
    <div className="flex mt-6 self-start px-4">
      <Card className="m-auto">
        <CardContent className="md:m-6 justify-items-center">
          <div className="text-center my-6">
            {booking.status === "pending" 
              ? <Hourglass className="justify-self-center p-2 m-2" size={48}/> 
              : <CircleCheckBig className="justify-self-center p-2 m-2 text-green-500" size={48}/>}
            <h2 className="text-2xl font-bold mb-2">Booking Submitted!</h2>
            <p className="text-muted-foreground">
              {booking.status === "pending" 
                ? "Your booking request is pending approval."
                : "Your booking request is approved."
              }
            </p>
          </div>

          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 gap-x-8 text-center md:text-left">
            <div>
              <h3 className="font-bold">Room</h3>
              <p>{booking.roomName}</p>
            </div>
            <div>
              <h3 className="font-bold">Date</h3>
              <p>{formatBookingDate(booking.startTime)}</p>
            </div>
            <div>
              <h3 className="font-bold">Time</h3>
              <p>
                {formatBookingTime(booking.startTime)} -{" "}
                {formatBookingTime(booking.endTime)}
              </p>
            </div>
            <div>
              <h3 className="font-bold">Purpose</h3>
              <p>
                {getPurposeLabel(booking.purpose)}
              </p>
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


