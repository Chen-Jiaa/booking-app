import type { Metadata } from "next";

import "../globals.css";

import { SupabaseProvider } from "@/components/providers/supabase-providers";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

import Footer from "../(main)/components/footer";
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
    <html lang="en">
      <body className="min-h-dvh">
        <SupabaseProvider>
            <SidebarProvider>
              <AppSidebar />
              <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                  <div className="flex items-center gap-2 px-4">
                    <SidebarTrigger className="-ml-1" />
                    <Separator className="mr-2 h-4" orientation="vertical" />
                    <p>{}</p>
                  </div>
                </header>
                <main className="px-4">
                    {children}
                </main>
                <footer className="mt-auto mb-0">
                    <Footer />
                </footer>
              </SidebarInset>
            </SidebarProvider>
        </SupabaseProvider> 

        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  )
}