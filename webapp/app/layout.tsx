// webapp/app/layout.tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "./components/Sidebar";
import PWARegister from "./components/PWARegister";
import SaleBanner from "./components/SaleBanner";
import { getSession } from "@/lib/auth";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "7 ROMS — CRM Dashboard",
  description: "Dashboard operativo para 7 ROMS",
  manifest: "/manifest.json",
  themeColor: "#7c3aed",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ROMS CRM",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  return (
    <html lang="es" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="min-h-full flex">
        <PWARegister />
        {session ? (
          <>
            <SaleBanner />
            <Sidebar user={session} />
            <main className="flex-1 ml-0 lg:ml-56 pt-18 lg:pt-0 p-4 lg:p-8">{children}</main>
          </>
        ) : (
          <main className="flex-1">{children}</main>
        )}
      </body>
    </html>
  );
}
