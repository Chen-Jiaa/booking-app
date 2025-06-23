import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { ListChecks, Settings, Undo2, Users } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { NavUser } from "./nav-user"

// Menu items.
const data = {
  navMain: [{
    icon: ListChecks,
    title: "Recent Bookings",
    url: "/admin",
  },
  {
    icon: Settings,
    title: "Rooms Setting",
    url: "/admin/rooms",
  },
  {
    icon: Users,
    title: "User List",
    url: "/admin/users",
  },
  ]
}

export function AppSidebar() {
  return (
    <Sidebar className="group/sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
          <Image 
            alt="Collective Logo"
            className="rounded-sm"
            height={20}
            src="/favicon.jpg"
            width={20}
          />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsed=true]/sidebar:hidden">
            <span className="truncate font-semibold"><Link href="/">Collective Booking</Link></span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.navMain.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
          <SidebarSeparator/>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/">
                    <Undo2/>
                    <span>Back to Room Booking</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
