"use server";

import { db } from "@/db";
import { rooms } from "@/db/schema";
import { getUserAndRole } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";

const AddRoomSchema = z
  .object({
    approval_required: z.boolean(),
    approvers: z.array(z.string().email()).optional(),
    available_to: z.string().min(1, "Please select who is this room viewable to"),
    capacity: z.coerce.number().int().positive("Capacity must be a positive number"),
    name: z.string().min(2, "Name is required"),
  })
  .superRefine((data, ctx) => {
    if (data.approval_required && (!data.approvers || data.approvers.length === 0)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select at least one approver",
        path: ["approvers"],
      });
    }
  });

export async function addRoom(data: z.infer<typeof AddRoomSchema>) {
  const { role } = await getUserAndRole();

  if (role !== "admin") {
    return { error: "Unauthorized", success: false };
  }

  const parsed = AddRoomSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message, success: false };
  }

  try {
    await db.insert(rooms).values({
      approvalRequired: parsed.data.approval_required,
      approvers: parsed.data.approvers ?? [],
      availableTo: parsed.data.available_to,
      capacity: parsed.data.capacity,
      name: parsed.data.name,
    });
    revalidatePath("/admin/rooms");
    revalidateTag("rooms");
    return { success: true };
  } catch (error) {
    console.error("Failed to add room:", error);
    return { error: "Failed to add room", success: false };
  }
}

export async function updateRoomApprovers(roomId: string, newApprovers: string[]) {
  try {
    await db.update(rooms).set({ approvers: newApprovers }).where(eq(rooms.id, roomId));
    revalidatePath("/admin/rooms");
    revalidateTag("rooms");
    return { success: true };
  } catch (error) {
    console.error("Failed to update approvers:", error);
    return { error: "Failed to update approvers", success: false };
  }
}

export async function updateRoomAvailabilityTo(
  roomId: string,
  value: "event_manager" | "superUser" | "user",
) {
  try {
    await db.update(rooms).set({ availableTo: value }).where(eq(rooms.id, roomId));
    revalidatePath("/admin/rooms");
    revalidateTag("rooms");
    return { success: true };
  } catch (error) {
    console.error("Failed to update availableTo:", error);
    return { error: "Failed to update available to", success: false };
  }
}

export async function updateRoomBoolean(
  roomId: string,
  field: "approvalRequired" | "availability",
  value: boolean,
) {
  try {
    await db
      .update(rooms)
      .set({ [field]: value })
      .where(eq(rooms.id, roomId));
    revalidatePath("/admin/rooms");
    revalidateTag("rooms"); // Revalidate the page to show fresh data
    return { success: true };
  } catch (error) {
    console.error(`Failed to update ${field}:`, error);
    return { error: `Failed to update ${field}`, success: false };
  }
}

export async function deleteRoom(roomId: string) {
  const { role } = await getUserAndRole();

  if (role !== "admin") {
    return { error: "Unauthorized", success: false };
  }

  try {
    await db.delete(rooms).where(eq(rooms.id, roomId));
    revalidatePath("/admin/rooms");
    revalidateTag("rooms");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete room:", error);
    return { error: "Failed to delete room", success: false };
  }
}
