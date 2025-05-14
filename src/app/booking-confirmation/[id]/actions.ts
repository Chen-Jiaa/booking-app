import { createClient } from "@/lib/supabase/server"
import { Bookings } from "@/types/booking"

export default async function fetchBookings(id: string): Promise<Bookings | null> {
    const supabase = await createClient()

    const {data, error} = await supabase
        .from("bookings")
        .select("*")
        .eq("id", id)
        .single<Bookings>()

        if (error) console.log(error)

        return data
}