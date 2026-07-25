/**
 * Root layout.
 *
 * Three faces, matching the Ontomorph reference:
 *  - Outfit        — geometric sans for display headings (tight, wide-set)
 *  - Inter         — body and UI text
 *  - JetBrains Mono — technical labels: codes, vocabularies, tokens, ids
 *
 * Note: Ontomorph's own headline face is a proprietary grotesque. Outfit is the
 * closest match available on Google Fonts and carries the same tight-tracked,
 * geometric feel at large display sizes.
 */
import type { ReactNode } from "react";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";

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

export const metadata = {
  title: "CareBridge OAU — referral continuity on the digital twin",
  description:
    "Referral continuity between the OAU Health Centre and OAUTHC. Built on Ontomorph digital twins and the HOLON clinical knowledge API.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${outfit.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-dvh bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
