import { createClient } from "@/lib/supabase/server";

import { fetchUserBookings } from "./actions";
import { BookingsList } from "./user-booking-table";

export default async function AdminDashboard() {
  const supabase = await createClient()
  const {data: {user}} = await supabase.auth.getUser();

  if (!user) {
    return <div>Please log in to view bookings.</div>
  }
  const bookings = await fetchUserBookings(user.id)

  return (
    <div className="container items-top mx-auto grid gap-5">
      <BookingsList bookings={bookings}/>
    </div>
  );
}
