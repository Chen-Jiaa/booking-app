import type { Metadata } from "next";

import "./globals.css";

import { SupabaseProvider } from "@/components/providers/supabase-providers";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
      <body className="min-h-dvh">
        <SupabaseProvider>
          {children}
          <SpeedInsights />
          <Analytics />
        </SupabaseProvider>
      </body>
    </html>
  );
}
