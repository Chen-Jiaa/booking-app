import type { Metadata } from "next";

import "../globals.css";

import { SupabaseProvider } from "@/components/providers/supabase-providers";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { AppSidebar } from "./admin/components/app-sidebar";

export const metadata: Metadata = {
  description: "Admin panel for managing bookings and resources",
  title: "Admin | Collective Booking App",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SupabaseProvider>
        <SidebarProvider>
            <div className="flex min-h-screen">
                <AppSidebar />
                <main className="flex-1 p-4">
                    <SidebarTrigger />
                    {children}
                    <SpeedInsights />
                    <Analytics />
                </main>
            </div>
        </SidebarProvider>
    </SupabaseProvider>     
  )
}