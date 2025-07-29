import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";

import { RoomList } from "./components/RoomList";

export default async function Home() {
  // const rooms = await fetchRooms()

  const roomData = await db
    .select()
    .from(rooms)
    .where(eq(rooms.availability, true))
  
  if (roomData.length === 0) {
      return <p className="text-center - mt-10">Failed to load rooms</p>
  }
  
  return (
      <RoomList roomData={roomData} />
  )
}
