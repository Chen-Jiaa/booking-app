"use server";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getUserAndRole } from "@/lib/supabase/server";
import { and, eq, like, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateUserRole(
  userId: string,
  newRole: "admin" | "event_manager" | "superUser" | "user",
) {
  const { role } = await getUserAndRole();

  if (role !== "admin") {
    return { error: "Unauthorized", success: false };
  }

  try {
    await db.update(profiles).set({ role: newRole }).where(eq(profiles.id, userId));
    revalidatePath("/admin/users");
    return { success: true };
  } catch (error) {
    console.error("Failed to update user role:", error);
    return { error: "Failed to update user role", success: false };
  }
}

export async function backfillCollectiveUsers() {
  const { role } = await getUserAndRole();

  if (role !== "admin") {
    return { count: 0, error: "Unauthorized", success: false };
  }

  try {
    const affected = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(and(like(profiles.email, "%@collective.my"), ne(profiles.role, "admin")));
    await db
      .update(profiles)
      .set({ role: "superUser" })
      .where(and(like(profiles.email, "%@collective.my"), ne(profiles.role, "admin")));
    revalidatePath("/admin/users");
    return { count: affected.length, success: true };
  } catch (error) {
    console.error("Failed to backfill collective users:", error);
    return { count: 0, error: "Failed to backfill users", success: false };
  }
}
