import type { Metadata } from "next";
import "./globals.css";
import NavBar from "./components/nav-bar";

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
      <body
        className={``}
      >
        <NavBar />
        {children}
      </body>
    </html>
  );
}
