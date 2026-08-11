"use server";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { and, eq, isNull, or } from "drizzle-orm";

const COLLECTIVE_DOMAIN = "@collective.my";

export async function handleVerify(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = formData.get("otp") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data.session || !data.user) {
    console.error("OTP verification failed:", error?.message);
    return { error: true };
  }

  if (email.endsWith(COLLECTIVE_DOMAIN)) {
    await db
      .update(profiles)
      .set({ role: "superUser" })
      .where(
        and(eq(profiles.id, data.user.id), or(isNull(profiles.role), eq(profiles.role, "user"))),
      );
  }

  return { success: true };
}
