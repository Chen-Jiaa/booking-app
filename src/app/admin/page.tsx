"use client";

{
  /*
    1. Ability to modify rooms
    2. Ability to approve and reject bookings
    3. Ability to edit forms    
*/
}

import AddRooms from "../components/admin-room-add-form";
import AdminTable from "../components/admin-booking-table";

export default function AdminDashboard() {
  return (
    <div className="container items-center mx-auto mt-5 grid gap-5">
      <AdminTable />
      <AddRooms />
    </div>
  );
}
