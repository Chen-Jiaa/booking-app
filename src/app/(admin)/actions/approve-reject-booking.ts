"use server";

import { getUserAndRole } from "@/lib/supabase/server";

import { updateBookingStatus } from "./booking-status-change";

export async function approveBooking(bookingId: number) {
  const { role } = await getUserAndRole();

  if (role !== "admin") {
    return { error: "Unauthorized: Admin access required", success: false as const };
  }

  return updateBookingStatus(bookingId, "confirmed");
}

export async function rejectBooking(bookingId: number) {
  const { role } = await getUserAndRole();

  if (role !== "admin") {
    return { error: "Unauthorized: Admin access required", success: false as const };
  }

  return updateBookingStatus(bookingId, "rejected");
}
