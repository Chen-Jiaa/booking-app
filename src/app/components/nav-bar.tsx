"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useSupabase } from "@/components/providers/supabase-providers";


export default function NavBar() {
  const {user, loading, role} = useSupabase()
  const pathname = usePathname();
  // const { user, loading, role } = useAuth();
  const router = useRouter()

  const navigation = [
    { name: "Book a Room", href: "/" },
    { name: "My Bookings", href: "/bookings" },
    ...(role === "admin" ? [{ name: "Admin Panel", href: "/admin" }] : []),
  ];

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <nav className="border-b">
      <div className="container mx-auto py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={"/"} className="text-xl font-bold">
              COLLECTIVE
            </Link>
            {!loading && (
              <div className="hidden md:flex items-center gap-4">
                {(user ? navigation : [navigation[0]]).map((item) => (
                  <Link
                    href={item.href}
                    key={item.name}
                    className={cn(
                      "text-sm transition-colors hover:text-primary",
                      pathname === item.href
                        ? "text-primary font-medium"
                        : "text-muted-foreground",
                    )}
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
                      variant="outline"
                      onClick={() => signOut()}
                    >
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className={cn(
                        "text-sm transition-colors hover:text-primary",
                        pathname === "/login"
                          ? "text-primary font-medium"
                          : "text-muted-foreground",
                      )}
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
                  href={item.href}
                  key={item.name}
                  className={cn(
                    "text-sm transition-colors hover:text-primary px-3 py-1 rounded-full",
                    pathname === item.href
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground",
                  )}
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
