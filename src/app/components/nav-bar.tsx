"use client";

import { useSupabase } from "@/components/providers/supabase-providers";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";


export default function NavBar() {
  const {loading, role, user} = useSupabase()
  const pathname = usePathname();
  const router = useRouter()
  

  const navigation = [
    { href: "/", name: "Book a Room" },
    { href: "/bookings", name: "My Bookings" },
    ...(role === "admin" ? [{ href: "/admin", name: "Admin Panel" }] : []),
  ];

  async function signOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto py-3 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link className="text-xl font-bold" href="/">
              COLLECTIVE
            </Link>
            {!loading && (
              <div className="hidden md:flex items-center gap-4">
                {(user ? navigation : [navigation[0]]).map((item) => (
                  <Link
                    className={cn(
                      "text-sm transition-colors hover:text-primary",
                      pathname === item.href
                        ? "text-primary font-medium"
                        : "text-muted-foreground",
                    )}
                    href={item.href}
                    key={item.name}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-4">
            {!loading && (
              <div className="flex items-center gap-4">
                {user ? (
                  <>
                    <span className="hidden md:inline text-muted-foreground">{user.email}</span>
                    <Button
                      onClick={() => void signOut()}
                      variant="outline"
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      className={cn(
                        "text-sm transition-colors hover:text-primary",
                        pathname === "/login"
                          ? "text-primary font-medium"
                          : "text-muted-foreground",
                      )}
                      href="/login"
                    >
                      Log In
                    </Link>
                    <Button asChild>
                      <Link href="/signup">Sign Up</Link>
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
        {!loading && (
              <div className="md:hidden flex items-center gap-2">
              {(user ? navigation : [navigation[0]]).map((item) => (
                <Link
                  className={cn(
                    "text-sm transition-colors hover:text-primary px-3 py-1 rounded-full",
                    pathname === item.href
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground",
                  )}
                  href={item.href}
                  key={item.name}
                >
                  {item.name}
                </Link>
              ))}
            </div>
            )}
        
      </div>
    </nav>
  );
}
