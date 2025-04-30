// 📁 File: src/app/signup/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: "http://localhost:3000", // change to your site domain in prod
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("Signup failed:", error.message);
    redirect("/error"); // or show error message (see below)
  }

  redirect("/verify?email=" + encodeURIComponent(email));
}
