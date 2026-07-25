/**
 * Persistent top navigation — the demo's role switcher.
 *
 * The build scope calls for a small persistent nav to jump between Nurse /
 * Doctor / Student / Clusters during the live demo, so it is always mounted and
 * highlights the active section.
 *
 * The mark is a Cortex mark, not Ontomorph's: two linked nodes (Health
 * Centre and OAUTHC) bridged by an arc. It is drawn in the same geometric,
 * monochrome idiom as the reference without passing Ontomorph's own logo off as
 * this app's.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Activity, BarChart3, ClipboardPlus, Menu, Stethoscope, User, X } from "lucide-react";

import { OfflineBanner } from "./offline-status";
import { cx } from "./ui";

const LINKS = [
  { href: "/intake", label: "Nurse", icon: ClipboardPlus },
  { href: "/doctor", label: "Doctor", icon: Stethoscope },
  { href: "/student/5a4d0000-0000-0000-0000-000000000102", label: "Student", icon: User },
  { href: "/clusters", label: "Clusters", icon: BarChart3 },
];

export function CortexMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      fill="none"
      aria-hidden
      className="shrink-0"
    >
      {/* the bridge */}
      <path
        d="M7 20c0-6 4-10 9-10s9 4 9 10"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
      {/* the two endpoints */}
      <circle cx="7" cy="21.5" r="3.4" fill="currentColor" />
      <circle cx="25" cy="21.5" r="3.4" fill="currentColor" />
      {/* the record travelling across */}
      <circle cx="16" cy="9.2" r="2.5" fill="currentColor" />
      <circle cx="11.2" cy="12.4" r="1.1" fill="currentColor" opacity="0.45" />
      <circle cx="20.8" cy="12.4" r="1.1" fill="currentColor" opacity="0.45" />
    </svg>
  );
}

function isActive(pathname: string, href: string): boolean {
  const base = href.split("?")[0];
  // /student/<id> should match any twin id, not just the demo one.
  if (base.startsWith("/student")) return pathname.startsWith("/student");
  if (base === "/intake") return pathname.startsWith("/intake");
  if (base === "/doctor") return pathname.startsWith("/doctor");
  return pathname === base || pathname.startsWith(`${base}/`);
}

export function SiteNav() {
  const pathname = usePathname() ?? "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the mobile sheet on navigation, and lock scroll while it is open.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header
      className={cx(
        "sticky top-0 z-50 border-b transition-all duration-300",
        scrolled
          ? "border-line bg-canvas/85 backdrop-blur-xl"
          : "border-transparent bg-canvas",
      )}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
        <Link
          href="/"
          className="flex items-center gap-2.5 text-[1.0625rem] font-semibold tracking-tight text-ink transition-opacity hover:opacity-70"
        >
          <CortexMark />
          Cortex
          <span className="hidden text-ink-3 sm:inline">OAU</span>
        </Link>

        {/* Desktop links */}
        <nav className="hidden items-center gap-1 md:flex" aria-label="Roles">
          {LINKS.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={label}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cx(
                  "flex items-center gap-2 rounded-full px-3.5 py-2 text-[0.9375rem] transition-colors duration-200",
                  active
                    ? "bg-raised font-medium text-ink"
                    : "text-ink-2 hover:bg-raised/70 hover:text-ink",
                )}
              >
                <Icon size={15} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[0.75rem] text-ink-2 lg:inline-flex">
            <span className="dot dot-ok dot-live" aria-hidden />
            Sandbox twin
          </span>

          <button
            type="button"
            className="btn btn-ghost md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={19} aria-hidden /> : <Menu size={19} aria-hidden />}
          </button>
        </div>
      </div>

      {/* Mobile sheet */}
      {open ? (
        <div className="fixed inset-0 top-16 z-40 animate-fade-in bg-canvas md:hidden">
          <nav className="flex flex-col gap-1 p-5" aria-label="Roles">
            {LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={label}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cx(
                    "flex items-center gap-3 rounded-xl px-4 py-3.5 text-base transition-colors",
                    active ? "bg-raised font-medium text-ink" : "text-ink-2",
                  )}
                >
                  <Icon size={18} aria-hidden />
                  {label}
                </Link>
              );
            })}
            <div className="rule my-4" />
            <p className="flex items-center gap-2 px-4 text-[0.8125rem] text-ink-3">
              <Activity size={14} aria-hidden />
              One sandbox twin, shared across every role.
            </p>
          </nav>
        </div>
      ) : null}
    </header>
  );
}

/** Shared page shell: nav, a centred column, and a footer. */
export function PageShell({
  children,
  width = "wide",
}: {
  children: React.ReactNode;
  width?: "wide" | "narrow";
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <SiteNav />
      <OfflineBanner />
      <main
        className={cx(
          "mx-auto w-full flex-1 px-5 pb-24 pt-10 sm:px-8 sm:pt-14",
          width === "narrow" ? "max-w-3xl" : "max-w-6xl",
        )}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[0.8125rem] text-ink-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-center gap-2">
          <CortexMark size={16} />
          Cortex OAU — hackathon prototype
        </p>
        <p>
          Built on{" "}
          <a
            href="https://developer.ontomorph.com/docs"
            target="_blank"
            rel="noreferrer"
            className="text-ink-2 underline decoration-line-strong underline-offset-2 transition-colors hover:text-ink"
          >
            Ontomorph
          </a>{" "}
          digital twins and HOLON.
        </p>
      </div>
    </footer>
  );
}
