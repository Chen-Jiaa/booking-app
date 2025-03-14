'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useSupabase } from "@/components/providers/supabase-providers"
import { Button } from "@/components/ui/button"

export default function NavBar() {
    const {user , isAdmin} = useSupabase();
    const pathname = usePathname();

    const navigation = [
        {name: "Book a Room", href: "/"},
        {name: "My Bookings", href:"/bookings"},
        {name: "Admin Panel", href: "/admin"}
    ]

    return (
        <nav className="border-b">
            <div className="container mx-auto py-3 px-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href={"/"} className="text-xl font-bold">
                            COLLECTIVE
                        </Link>
                        <div className="hidden md:flex items-center gap-4">
                            {navigation.map((item)=>(
                                <Link 
                                href={item.href} 
                                key={item.name}
                                className={cn(
                                    "text-sm transition-colors hover:text-primary",
                                    pathname === item.href ? "text-primary font-medium"
                                    : "text-muted-foreground"
                                )}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <>
                                <span>{user.email}</span>
                                <Button variant="outline" onClick={()=>supabase.auth.signOut()}>
                                    Sign Out
                                </Button>
                            </>
                        ) : (
                            <Button asChild>
                                <Link href="/auth">Sign In</Link>
                            </Button>
                        )}
                    </div>
                </div>
                <div className="md:hidden flex items-center gap-2">
                    {navigation.map((item)=>(
                        <Link 
                        href={item.href} 
                        key={item.name}
                        className={cn(
                            "text-sm transition-colors hover:text-primary px-3 py-1 rounded-full",
                            pathname === item.href ? "bg-primary/10 text-primary font-medium"
                            : "text-muted-foreground"
                        )}
                        >
                            {item.name}
                        </Link>
                    ))}
                </div>
            </div>
        </nav>
    )
}