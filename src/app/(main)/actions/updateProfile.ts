"use server";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";

interface UpdateProfileInput {
  email?: string;
  fullName: string;
  phone?: string;
}

export async function updateProfile(values: UpdateProfileInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Unauthorized", success: false };
  }

  try {
    await db
      .update(profiles)
      .set({
        email: values.email ?? null,
        fullName: values.fullName,
        phone: values.phone ?? null,
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, user.id));

    return { success: true };
  } catch (error) {
    console.error("Failed to update profile:", error);
    return { error: "Failed to update profile", success: false };
  }
}
