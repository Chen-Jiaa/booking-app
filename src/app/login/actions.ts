"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendOtp(formData: FormData) {
  const email = formData.get("email") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: "http://localhost:3000", // or your production URL
    },
  });

  if (error) {
    if (error.message.includes("Signups not allowed for this instance")) {
      return { error: "user_not_found" };
    }

    console.error("Error sending OTP:", error.message);
    return { error: "other" };
  }

  redirect(`/verify?email=${encodeURIComponent(email)}`);
}
