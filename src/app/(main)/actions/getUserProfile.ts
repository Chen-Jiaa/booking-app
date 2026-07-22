"use server";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { getAuthUser } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";

export async function getUserProfile() {
  const user = await getAuthUser();

  if (!user) {
    return null;
  }

  const result = await db
    .select({
      email: profiles.email,
      fullName: profiles.fullName,
      phone: profiles.phone,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  return result[0] ?? null;
}
