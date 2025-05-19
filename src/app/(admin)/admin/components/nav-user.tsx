"use client"

import { useSupabase } from "@/components/providers/supabase-providers"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { supabase } from "@/lib/supabase/client"
import {
  ChevronsUpDown,
  LogOut,
} from "lucide-react"
import { useRouter } from "next/navigation"

export function NavUser() {
    const {user} = useSupabase()
    const { isMobile } = useSidebar() 
    const router = useRouter()

    async function signOut() {
        await supabase.auth.signOut()
        router.refresh()
    }

    return (
        <SidebarMenu>
            <SidebarMenuItem>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    size="lg"
                >
                    <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate text-xs">{user?.email}</span>
                    </div>
                    <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                align="end"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
                side={isMobile ? "bottom" : "top"}
                sideOffset={4}
                >
                <DropdownMenuItem>
                    <LogOut onClick={() => void signOut} />
                    Log out
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    )
}
