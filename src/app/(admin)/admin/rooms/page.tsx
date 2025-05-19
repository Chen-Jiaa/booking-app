import { fetchAdmins } from "./actions/fetchAdmins";
import AddRooms from "./components/AddRoomForm";
import RoomTable from "./components/RoomsTable";

export default async function page() {
    const emails = await fetchAdmins()
    if (!emails) {
      return <p className="text-center - mt-10">Failed to admin emails</p>
    }

    return (
        <>
            <RoomTable adminEmails={emails} />
            <AddRooms adminEmails={emails}/>
        </>
    )
}