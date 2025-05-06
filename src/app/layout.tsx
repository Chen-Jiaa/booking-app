import type { Metadata } from "next"
import "./globals.css"
import NavBar from "./components/nav-bar"
import Footer from "./components/footer"
import { SupabaseProvider } from "@/components/providers/supabase-providers"
import { Analytics } from "@vercel/analytics/react"
import { SpeedInsights } from "@vercel/speed-insights/next"


export const metadata: Metadata = {
  title: "Collective Booking App",
  description: "Booking App for Church Resources",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={"grid grid-rows-[auto_1fr_auto] min-h-dvh"}>
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
