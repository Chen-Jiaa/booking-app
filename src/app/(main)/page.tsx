import { getUserProfile } from "./actions/getUserProfile";
import { fetchRooms } from "./actions/fetchRooms";
import { RoomList } from "./components/RoomList";
import { getUserAndRole } from "@/lib/supabase/server";
import { filterRoomsByRole } from "@/lib/roles";

export default async function Home() {
  const [allRooms, initialProfile, { role }] = await Promise.all([
    fetchRooms(),
    getUserProfile(),
    getUserAndRole(),
  ]);

  const roomData = filterRoomsByRole(allRooms, role);

  if (roomData.length === 0) {
    return <p className="text-center mt-10">No rooms available.</p>;
  }

  return <RoomList initialProfile={initialProfile} roomData={roomData} />;
}
