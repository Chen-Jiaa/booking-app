// 📁 src/app/signup/actions.ts
"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signup(formData: FormData) {
  const email = formData.get("email") as string;
  const supabase = await createClient();

  const { data: users, error: fetchError } = await supabase
    .from("auth_users")
    .select("id")
    .eq("email", email)
    .single()

  if (fetchError === null && users) {
    return { error: "user_exists" };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: "http://localhost:3000",
    },
  });

  if (error) {
    console.error("Signup failed:", error.message);
    return { error: "server_error" };
  }

  redirect("/email-confirmation");
}