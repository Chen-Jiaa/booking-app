import { createClient } from "@/lib/supabase/server";

import { getUserProfile } from "./actions/getUserProfile";
import { RoomList } from "./components/RoomList";

export default async function Home() {
  const supabase = await createClient();

  const [{ data: roomData, error }, initialProfile] = await Promise.all([
    supabase.from("rooms").select("*").eq("availability", true),
    getUserProfile(),
  ]);

  if (error) {
    console.error("Error fetching rooms:", error);
    return <p className="text-center mt-10">Failed to load rooms</p>;
  }

  if (roomData.length === 0) {
    return <p className="text-center - mt-10">Failed to load rooms</p>;
  }

  return <RoomList initialProfile={initialProfile} roomData={roomData} />;
}
