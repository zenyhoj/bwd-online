import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NavigationProgress } from "@/components/navigation-progress";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

export const metadata: Metadata = {
  title: "BWD Online Water Application System",
  description: "Production-ready online water application system for applications, inspections, and payments.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BWD Online",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: "/logo-main.jpg",
    shortcut: "/logo-main.jpg",
    apple: "/logo-main.jpg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body suppressHydrationWarning className={`${inter.variable} font-sans`}>
        <NavigationProgress />
        {children}
      </body>
    </html>
  );
}
