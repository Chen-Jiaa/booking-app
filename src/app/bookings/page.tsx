"use client";

import { BookingsList } from "../components/new-user-table";

export default function AdminDashboard() {
  return (
    <div className="container items-top mx-auto grid gap-5">
      <BookingsList />
    </div>
  );
}
