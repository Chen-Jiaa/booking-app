import { getUserProfile } from "./actions/getUserProfile";
import { fetchRooms } from "./actions/fetchRooms";
import { RoomList } from "./components/RoomList";

export default async function Home() {
  const [allRooms, initialProfile] = await Promise.all([
    fetchRooms(),
    getUserProfile(),
  ]);

  if (allRooms.length === 0) {
    return (
      <div className="container mx-auto px-6 py-16 text-center">
        <p className="text-muted-foreground">No rooms are available at this time.</p>
      </div>
    );
  }

  return <RoomList initialProfile={initialProfile} roomData={allRooms} />;
}
