"use client";

import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function AuthButton() {
  return (
    <>
      <Link className="text-sm transition-colors hover:text-primary" href="/login">
        Log In
      </Link>
      <Button asChild>
        <Link href="/signup">Sign Up</Link>
      </Button>
    </>
  );
}

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <Button onClick={() => void handleSignOut()} variant="outline">
      Log Out
    </Button>
  );
}
