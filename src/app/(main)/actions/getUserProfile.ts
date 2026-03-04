'use server'

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";

export async function getUserProfile() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const result = await db
    .select({
      email: profiles.email,
      fullName: profiles.fullName,
      phone: profiles.phone,
    })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1)

  return result[0] ?? null
}
