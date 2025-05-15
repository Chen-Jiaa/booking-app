import AdminTable from "./components/admin-booking-table";
import AddRooms from "./components/admin-room-add-form";

export default function AdminDashboard() {
  return (
      <div className="container items-center mx-auto mt-5 grid gap-5">
        <AdminTable />
        <AddRooms />
      </div>
  );
}
