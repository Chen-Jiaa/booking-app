"use client";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";

export function AuthButton() {
  return (
    <>
      <Link
        className="text-sm transition-colors hover:text-primary"
        href="/login"
      >
        Log In
      </Link>
      <Button asChild>
        <Link href="/signup">Sign Up</Link>
      </Button>
    </>
  );
}

export async function handleSignOut() {
  await supabase.auth.signOut();
  globalThis.location.href = "/";
}

export function SignOutButton() {
  return (
    <Button onClick={() => void handleSignOut()} variant="outline">
      Sign Out
    </Button>
  );
}
