"use client";

import { signOut } from "@/app/actions/signOut";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.push("/");
  }

  return (
    <Button onClick={() => void handleSignOut()} variant="outline">
      Log Out
    </Button>
  );
}
