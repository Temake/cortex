/**
 * 404. Also gives the App Router an explicit not-found boundary, which the
 * production build needs in order to collect the `/_not-found` route.
 *
 * Client component because it passes lucide icon components as props to
 * `ButtonLink` — a component function cannot cross the server/client boundary.
 */
"use client";

import { ArrowLeft } from "lucide-react";

import { SiteFooter, SiteNav } from "@/components/site-nav";
import { ButtonLink, Eyebrow } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteNav />

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 py-24 sm:px-8">
        <Eyebrow className="mb-3.5">404</Eyebrow>
        <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">
          Nothing here.
          <span className="headline-mute"> Try one of the four views.</span>
        </h1>
        <p className="mt-4 max-w-lg text-[1.0625rem] leading-relaxed text-ink-2">
          The page you asked for does not exist. If you were opening a referral,
          the link may have been truncated — paste the token directly instead.
        </p>

        <div className="mt-9 flex flex-wrap gap-3">
          <ButtonLink href="/" icon={ArrowLeft}>
            Back to start
          </ButtonLink>
          <ButtonLink href="/doctor" variant="secondary">
            Open a referral
          </ButtonLink>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
