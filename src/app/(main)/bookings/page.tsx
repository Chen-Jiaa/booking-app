import { db } from "@/db";
import { bookings } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { and, desc, eq, ne } from "drizzle-orm";

import { BookingsList } from "./user-booking-table";

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) {
    return <div>Please log in to view bookings.</div>
  }
  // const bookings = await fetchUserBookings(user.id)

  const booking = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.userId,user.id), ne(bookings.status, "cancelled")))
    .orderBy(desc(bookings.startTime))

  return (
    <div className="container items-top mx-auto grid gap-5">
      <BookingsList bookings={booking}/>
    </div>
  );
}
