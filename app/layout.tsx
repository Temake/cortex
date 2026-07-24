/**
 * Root layout. Intentionally bare — the frontend is a separate piece of work;
 * this exists so the App Router has a valid root while the API routes are
 * built and tested.
 */
import type { ReactNode } from "react";

export const metadata = {
  title: "CareBridge OAU",
  description:
    "Referral continuity between the OAU Health Centre and OAUTHC, on Ontomorph digital twins.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
