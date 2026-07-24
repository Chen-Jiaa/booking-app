"use server";

import { db } from "@/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { and, eq, ne } from "drizzle-orm";

const COLLECTIVE_DOMAIN = "@collective.my";

export async function handleVerify(formData: FormData) {
  const email = formData.get("email") as string;
  const token = formData.get("otp") as string;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data.session) {
    console.error("OTP verification failed:", error?.message);
    return { error: true };
  }

  if (email.endsWith(COLLECTIVE_DOMAIN)) {
    await db
      .update(profiles)
      .set({ role: "superUser" })
      .where(and(eq(profiles.email, email), ne(profiles.role, "admin")));
  }

  return { success: true };
}
