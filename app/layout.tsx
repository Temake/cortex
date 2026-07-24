/**
 * Root layout — Inter for body, Source Serif 4 for display headings.
 * Global CSS imported here so every page inherits the design tokens.
 */
import type { ReactNode } from "react";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
  weight: ["400", "600", "700"],
});

export const metadata = {
  title: "Cortex — CareBridge OAU",
  description:
    "Referral continuity between the OAU Health Centre and OAUTHC, built on Ontomorph digital twins and the HOLON clinical knowledge API.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
