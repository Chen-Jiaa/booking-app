"use client"

import { cn } from "@/lib/utils"
import Link from "next/link"
import { usePathname } from "next/navigation"

interface NavItem {
  href: string
  name: string
}

interface NavLinksProps {
  navItems: NavItem[]
}

export default function NavLinks({navItems}: NavLinksProps) {
    const pathname = usePathname()
    
    return (
        <>
            {navItems.map((item) => (
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
        </>
    )
}