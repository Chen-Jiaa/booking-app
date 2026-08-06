import { getUserProfile } from "./actions/getUserProfile";
import { fetchRooms } from "./actions/fetchRooms";
import { RoomList } from "./components/RoomList";

export default async function Home() {
  const [allRooms, initialProfile] = await Promise.all([
    fetchRooms(),
    getUserProfile(),
  ]);

  if (allRooms.length === 0) {
    return <p className="text-center mt-10">No rooms available.</p>;
  }

  return <RoomList initialProfile={initialProfile} roomData={allRooms} />;
}
