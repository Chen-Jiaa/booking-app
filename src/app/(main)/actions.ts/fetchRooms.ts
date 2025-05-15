import { createClient } from "@/lib/supabase/server";

import { Rooms } from "../../../types/room";

export async function fetchRooms(): Promise< Rooms[] | undefined > {
    const supabase = await createClient()

    await supabase.auth.getSession()

    const { data,error } = await supabase
        .from("rooms")
        .select()
        .eq("availability", true)

    if (error) {
        console.log(error)
    } 
      
    if (data) {
        const sortedRooms = [...data as Rooms[]].sort((a, b) =>
            a.name.localeCompare(b.name),
        )

        return sortedRooms
    }
}