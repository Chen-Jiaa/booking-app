export const dynamic = "force-dynamic";

import { db } from "@/db";
import { bookingDays, bookings, rooms } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";

import EditBookingForm from "../../../components/EditBookingForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditBookingPage({ params }: PageProps) {
  const { id: idParam } = await params;
  const id = Number(idParam);

  if (Number.isNaN(id)) {
    return <p className="text-center mt-10">Invalid booking ID.</p>;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return <p className="text-center mt-10">Please log in to edit bookings.</p>;
  }

  const result = await db.select().from(bookings).where(eq(bookings.id, id)).limit(1);

  const booking = result[0] as (typeof result)[0] | undefined;

  if (!booking) {
    return <p className="text-center mt-10">Booking not found.</p>;
  }

  if (booking.userId !== user.id) {
    return <p className="text-center mt-10">You can only edit your own bookings.</p>;
  }

  if (booking.status === "cancelled" || booking.status === "rejected") {
    return <p className="text-center mt-10">This booking cannot be edited.</p>;
  }

  // Fetch booking days for multi-day bookings
  let days: (typeof bookingDays.$inferSelect)[] = [];
  if (booking.isMultiDay) {
    days = await db.select().from(bookingDays).where(eq(bookingDays.bookingId, id));
  }

  // Fetch rooms for availability checking
  const roomData = await db.select().from(rooms).where(eq(rooms.availability, true));

  return (
    <div className="container mx-auto py-6 px-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Edit Booking</h1>
      <EditBookingForm booking={booking} bookingDays={days} rooms={roomData} />
    </div>
  );
}
