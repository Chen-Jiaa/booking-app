'use server'

import { db } from "@/db";
import { rooms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function updateRoomApprovers(roomId: string, newApprovers: string[]) {
  try {
    await db.update(rooms).set({ approvers: newApprovers }).where(eq(rooms.id, roomId));
    revalidatePath('/admin/rooms');
    return { success: true };
  } catch (error) {
    console.error('Failed to update approvers:', error);
    return { error: 'Failed to update approvers', success: false };
  }
}

export async function updateRoomAvailabilityTo(roomId: string, value: 'superUser' | 'user') {
  try {
    await db.update(rooms).set({ availableTo: value }).where(eq(rooms.id, roomId));
    revalidatePath('/admin/rooms');
    return { success: true };
  } catch (error) {
    console.error('Failed to update availableTo:', error);
    return { error: 'Failed to update available to', success: false };
  }
}

export async function updateRoomBoolean(roomId: string, field: 'approval_required' | 'availability', value: boolean) {
  try {
    await db.update(rooms).set({ [field]: value }).where(eq(rooms.id, roomId));
    revalidatePath('/admin/rooms'); // Revalidate the page to show fresh data
    return { success: true };
  } catch (error) {
    console.error(`Failed to update ${field}:`, error);
    return { error: `Failed to update ${field}`, success: false };
  }
}