"use client";

{
  /*
    1. Ability to modify rooms
    2. Ability to approve and reject bookings
    3. Ability to edit forms    
*/
}

import AdminTable from "./admin-booking-table";
import AddRooms from "./admin-room-add-form";

export default function AdminDashboard() {
  return (
    <div className="container items-center mx-auto mt-5 grid gap-5">
      <AdminTable />
      <AddRooms />
    </div>
  );
}
