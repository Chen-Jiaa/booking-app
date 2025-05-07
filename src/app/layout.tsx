import type { Metadata } from "next"

import "./globals.css"

import { SupabaseProvider } from "@/components/providers/supabase-providers"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"

import Footer from "./components/footer"
import NavBar from "./components/nav-bar"


export const metadata: Metadata = {
  description: "Booking App for Church Resources",
  title: "Collective Booking App",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="grid grid-rows-[auto_1fr_auto] min-h-dvh">
        <SupabaseProvider>
          <NavBar />
          {children}
          <SpeedInsights />
          <Analytics />
          <Footer />          
        </SupabaseProvider>
      </body>
    </html>
  );
}
