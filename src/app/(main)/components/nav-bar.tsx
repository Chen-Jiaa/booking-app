import { getUserAndRole } from "@/lib/supabase/server";
import Link from "next/link";

import { AuthButton, SignOutButton } from "./nav-components/NavButtons";
import NavLinks from "./nav-components/NavLinks";

export default async function NavBar() {
  const { role, user } = await getUserAndRole();

  const navigation = [
    { href: "/", name: "Book a Room" },
    { href: "/calendar", name: "Calendar" },
    { href: "/bookings", name: "My Bookings" },
    { href: "/settings", name: "Settings" },
    ...(role === "admin" ? [{ href: "/admin", name: "Admin Panel" }] : []),
  ];

  return (
    <nav className="border-b">
      <div className="container mx-auto py-4 px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link className="text-xl font-bold" href="/">
              COLLECTIVE
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <NavLinks navItems={user ? navigation : [navigation[0], navigation[1]]} />
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <span className="hidden md:inline text-muted-foreground">{user.email}</span>
                  <SignOutButton />
                </>
              ) : (
                <AuthButton />
              )}
            </div>
          </div>
        </div>
        <div className="md:hidden flex items-center gap-2">
          <NavLinks navItems={user ? navigation : [navigation[0], navigation[1]]} />
        </div>
      </div>
    </nav>
  );
}
