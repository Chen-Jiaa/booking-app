import { createClient } from "@/lib/supabase/server";

import { RoomList } from "./components/RoomList";

export default async function Home() {
  const supabase = await createClient();

  const { data: roomData, error } = await supabase
    .from("rooms")
    .select("*")
    .eq("availability", true);

  if (error) {
    console.error("Error fetching rooms:", error);
    return <p className="text-center mt-10">Failed to load rooms</p>;
  }

  if (roomData.length === 0) {
    return <p className="text-center - mt-10">Failed to load rooms</p>;
  }

  return <RoomList roomData={roomData} />;
}
