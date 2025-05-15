"use server"

import { createClient } from "@/lib/supabase/server"

export async function handleVerify(formData: FormData) {
  const email = formData.get("email") as string
  const token = formData.get("otp") as string

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  if (error || !data.session) {
    console.error("OTP verification failed:", error?.message)
    return { error: true }
  }

  return { success: true }
}
