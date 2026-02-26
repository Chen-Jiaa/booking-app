import { rejectBooking } from "@/app/(admin)/actions/approve-reject-booking";
import { formatBookingDate, formatBookingTime } from "@/lib/date-utils";
import { getPurposeLabel } from "@/lib/getPurposeLabel";
import Link from "next/link";

export default async function RejectBookingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookingId = Number(id);

  if (Number.isNaN(bookingId)) {
    return <p>Invalid booking ID.</p>;
  }

  const result = await rejectBooking(bookingId);

  if (!result.success) {
    return <p>Failed to reject booking: {result.error}</p>;
  }

  const { booking } = result;
  const startTime = new Date(booking.startTime);
  const endTime = new Date(booking.endTime);

  return (
    <div className="flex justify-center">
      <div className="mx-auto max-w-md rounded-lg border p-6 text-center">
        <h1 className="mb-2 text-xl font-semibold">Booking Rejected ❌</h1>
        <div className="mt-4 space-y-1 text-left text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Room:</span>{" "}
            {booking.roomName}
          </p>
          <p>
            <span className="font-medium text-foreground">Name:</span>{" "}
            {booking.name}
          </p>
          <p>
            <span className="font-medium text-foreground">Email:</span>{" "}
            {booking.email}
          </p>
          <p>
            <span className="font-medium text-foreground">Date:</span>{" "}
            {formatBookingDate(startTime)}
          </p>
          <p>
            <span className="font-medium text-foreground">Time:</span>{" "}
            {formatBookingTime(startTime)} – {formatBookingTime(endTime)}
          </p>
          <p>
            <span className="font-medium text-foreground">Purpose:</span>{" "}
            {getPurposeLabel(booking.purpose)}
          </p>
        </div>
        <Link
          className="mt-6 inline-block text-sm text-primary underline"
          href="/admin"
        >
          ← Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
