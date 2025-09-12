'use server'

import { updateCalendarEvent } from "@/lib/google-calendar";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function cancelUserBooking(id: number): Promise<void> {

    try {
        const supabase = await createClient();

        const { data: result, error } = await supabase
            .from("bookings")
            .update({ status: "cancelled" })
            .eq("id", id)
            .select()
            .single();

         const cancelledBooking = result[0] as typeof result[0] | undefined

        if (error) {
            console.error("Supabase error:", error);
            throw new Error(error.message);
        }

        if (!cancelledBooking) {
            throw new Error("Failed to cancel booking: Booking not found.");
        }

        // The logic for updating the calendar event can remain the same
        await updateCalendarEvent(cancelledBooking);

        revalidatePath("/bookings");
    } catch (error) {
        console.error("Error in cancelUserBooking:", error);
        throw new Error("Failed to cancel the booking.");
    }
}