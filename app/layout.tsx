import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Inter } from "next/font/google";
import { NavigationProgress } from "@/components/navigation-progress";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans"
});

const geist = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading"
});

const themeInitScript = `
  (() => {
    try {
      const storedTheme = localStorage.getItem("theme");
      const theme = storedTheme === "light" || storedTheme === "dark" || storedTheme === "system"
        ? storedTheme
        : "system";
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldUseDark = theme === "dark" || (theme === "system" && prefersDark);

      document.documentElement.classList.toggle("dark", shouldUseDark);
      document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
    } catch (_) {}
  })();
`;

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning className={`${inter.variable} ${geist.variable} font-sans`}>
        <NavigationProgress />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
