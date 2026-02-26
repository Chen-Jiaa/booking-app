'use server'

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getUserAndRole } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateUserRole(userId: string, newRole: 'admin' | 'event_manager' | 'user') {
  const { role } = await getUserAndRole()

  if (role !== 'admin') {
    return { error: 'Unauthorized', success: false }
  }

  try {
    await db.update(profiles).set({ role: newRole }).where(eq(profiles.id, userId));
    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error('Failed to update user role:', error);
    return { error: 'Failed to update user role', success: false };
  }
}
