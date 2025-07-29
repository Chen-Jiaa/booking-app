import { db } from "@/db";
import { profiles, rooms } from "@/db/schema";
import { eq } from "drizzle-orm";

import { fetchAdmins } from "./actions/fetchAdmins";
import AddRooms from "./components/AddRoomForm";
import RoomTable from "./components/RoomsTable";

export default async function page() {
    const emails = await fetchAdmins()
    if (!emails) {
      return <p className="text-center - mt-10">Failed to admin emails</p>
    }

    const roomData = await db.select().from(rooms).orderBy(rooms.name)

    const adminProfiles = await db.select({email: profiles.email}).from(profiles).where(eq(profiles.role, 'admin'))

    const adminEmails = adminProfiles.map(p => p.email).filter(Boolean) as string[]

    return (
        <>
            <RoomTable adminEmails={adminEmails} initialData={roomData} />
            <AddRooms adminEmails={emails}/>
        </>
    )
}