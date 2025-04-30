"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/context/AuthContext";

export default function NavBar() {
  // const {user , isAdmin} = useSupabase()
  const pathname = usePathname();
  const { setTheme } = useTheme();
  const { user, loading, role } = useAuth();

  const navigation = [
    { name: "Book a Room", href: "/" },
    { name: "My Bookings", href: "/bookings" },
    ...(role === "admin" ? [{ name: "Admin Panel", href: "/admin" }] : []),
  ];

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
                    <span className="text-muted-foreground">{user.email}</span>
                    <Button
                      variant="outline"
                      onClick={() => supabase.auth.signOut()}
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
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span className="sr-only">Toggle theme</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setTheme("light")}>
                    Light
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>
                    Dark
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>
                    System
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        <div className="md:hidden flex items-center gap-2">
          {navigation.map((item) => (
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
      </div>
    </nav>
  );
}
