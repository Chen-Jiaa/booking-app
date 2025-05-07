"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendOtp(formData: FormData) {
  const email = formData.get("email") as string;

  if (!email || typeof email !== "string") {
    return { error: "invalid_email" };
  }

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!isValidEmail) {
    return { error: "invalid_email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: "https://booking.collective.my/",
    },
  });

  if (error) {
    if (
      error.message.includes("Signups not allowed") ||
      error.message.includes("User not found") ||
      error.status === 400
    ) {
      return { error: "user_not_found" };
    }

    console.error("OTP error:", error.message);
    return { error: "server_error" };
  }


  redirect(`/verify?email=${encodeURIComponent(email)}`);
}
