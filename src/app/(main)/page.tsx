import { fetchRooms } from "./actions.ts/fetchRooms";
import { RoomList } from "./components/RoomList";


export default async function Home() {
  const rooms = await fetchRooms()
  
  if (!rooms) {
      return <p className="text-center - mt-10">Failed to load rooms</p>
  }
  
  return (
      <RoomList rooms={rooms} />
  )
}
