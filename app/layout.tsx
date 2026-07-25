/**
 * Root layout.
 *
 * Three faces:
 *  - Outfit         — geometric sans for display headings (tight, wide-set)
 *  - Inter          — body and UI text
 *  - JetBrains Mono — technical labels: codes, vocabularies, tokens, ids
 *
 * Also the PWA entry point: the manifest and icons are declared here and the
 * service worker is registered by PwaRegister.
 *
 * OfflineBanner is deliberately NOT mounted here. It has to sit directly below
 * the sticky nav, and the nav lives inside each page's shell — mounting the
 * banner in the layout would place it above the nav in document order and its
 * sticky offset would be wrong.
 */
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";

import { PwaRegister } from "@/components/offline-status";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Cortex OAU — health record continuity",
  description:
    "Log a visit at the OAU Health Centre, refer to OAUTHC with scoped consent, and check a medicine against what you already take. Works offline at intake.",
  applicationName: "Cortex",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Cortex",
    // Keeps the iOS status bar legible against the white canvas.
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#4338ca",
  width: "device-width",
  initialScale: 1,
  // Installed as an app, the shell should not bounce-scroll like a document.
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
