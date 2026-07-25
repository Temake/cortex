/**
 * Shared UI primitives.
 *
 * Everything here is presentational and unopinionated about data, so the pages
 * stay short and consistent. Styling lives in the `.btn` / `.card` / `.pill`
 * classes in globals.css rather than inline Tailwind, so a token change
 * propagates everywhere at once.
 */
"use client";

import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ElementType,
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { AlertCircle, Check, Copy } from "lucide-react";

function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ── Reveal on scroll ─────────────────────────────────────────────── */

/**
 * Fades and lifts its children in when they first scroll into view.
 * Reveals once and then stops observing; `prefers-reduced-motion` is handled in
 * CSS, which pins the element visible.
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: ReactNode;
  /** Stagger, in ms. */
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // If it is already on screen at mount, reveal without waiting for a scroll.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={cx("reveal", className)}
      data-visible={visible || undefined}
      style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties}
    >
      {children}
    </Tag>
  );
}

/* ── Button ───────────────────────────────────────────────────────── */

/*
 * NOTE ON ICON PROPS: `icon` / `iconRight` here (and on Pill) take a component
 * type, not an element. That keeps call sites terse (`icon={Plus}`) but means a
 * component function is being passed as a prop — which React cannot serialize
 * across the server/client boundary. Any page that passes an icon prop must
 * therefore be a client component. The build fails loudly if it is not.
 */

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  pending = false,
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
  disabled,
  ...rest
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Swaps the leading icon for a spinner and blocks interaction. */
  pending?: boolean;
  icon?: ElementType;
  iconRight?: ElementType;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx("btn", `btn-${variant}`, size !== "md" && `btn-${size}`, className)}
      disabled={disabled || pending}
      {...rest}
    >
      {pending ? <span className="btn-spinner" aria-hidden /> : Icon ? <Icon size={16} aria-hidden /> : null}
      {children}
      {IconRight && !pending ? <IconRight size={16} aria-hidden /> : null}
    </button>
  );
}

/** Same visual language as Button, rendered as a Next link. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  className,
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ElementType;
  iconRight?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cx("btn", `btn-${variant}`, size !== "md" && `btn-${size}`, className)}
    >
      {Icon ? <Icon size={16} aria-hidden /> : null}
      {children}
      {IconRight ? <IconRight size={16} aria-hidden /> : null}
    </Link>
  );
}

/* ── Card ─────────────────────────────────────────────────────────── */

export function Card({
  className,
  interactive = false,
  children,
  ...rest
}: { interactive?: boolean } & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx("card", interactive && "card-interactive", className)} {...rest}>
      {children}
    </div>
  );
}

/* ── Pill ─────────────────────────────────────────────────────────── */

type PillTone = "neutral" | "ok" | "warn" | "danger" | "info" | "solid";

export function Pill({
  tone = "neutral",
  mono = false,
  icon: Icon,
  className,
  children,
  ...rest
}: {
  tone?: PillTone;
  /** Monospace — use for codes, vocabularies, ids. */
  mono?: boolean;
  icon?: ElementType;
  children: ReactNode;
} & HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cx("pill", tone !== "neutral" && `pill-${tone}`, mono && "pill-mono", className)}
      {...rest}
    >
      {Icon ? <Icon size={12} aria-hidden /> : null}
      {children}
    </span>
  );
}

/* ── Status dot ───────────────────────────────────────────────────── */

export function Dot({
  tone = "idle",
  live = false,
  className,
}: {
  tone?: "ok" | "warn" | "danger" | "info" | "idle";
  /** Adds an expanding pulse ring. */
  live?: boolean;
  className?: string;
}) {
  return <span className={cx("dot", `dot-${tone}`, live && "dot-live", className)} aria-hidden />;
}

/* ── Eyebrow ──────────────────────────────────────────────────────── */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("eyebrow", className)}>{children}</p>;
}

/* ── Form field ───────────────────────────────────────────────────── */

export function Field({
  label,
  hint,
  error,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-[0.8125rem] text-danger">
          <AlertCircle size={13} aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-[0.8125rem] text-ink-3">{hint}</p>
      ) : null}
    </div>
  );
}

/* ── Copy-to-clipboard ────────────────────────────────────────────── */

export function CopyButton({
  value,
  label = "Copy",
  className,
  size = "sm",
}: {
  value: string;
  label?: string;
  className?: string;
  size?: ButtonSize;
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1800);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission). Fall
      // back to a selection-based copy so the button still does something.
      const area = document.createElement("textarea");
      area.value = value;
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        /* give up silently — the value is on screen to select manually */
      }
      document.body.removeChild(area);
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size={size}
      onClick={copy}
      icon={copied ? Check : Copy}
      className={className}
      aria-live="polite"
    >
      {copied ? "Copied" : label}
    </Button>
  );
}

/* ── Error note ───────────────────────────────────────────────────── */

export function ErrorNote({
  code,
  message,
  className,
}: {
  code?: string;
  message: string;
  className?: string;
}) {
  return (
    <div className={cx("alert alert-major animate-fade-in", className)} role="alert">
      <div className="flex items-start gap-3">
        <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="text-[0.9375rem] font-medium">{message}</p>
          {code ? (
            <p className="mt-1 font-mono text-[0.6875rem] tracking-wide opacity-70">{code}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ── Empty state ──────────────────────────────────────────────────── */

export function EmptyState({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon?: ElementType;
  title: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("px-6 py-14 text-center", className)}>
      {Icon ? (
        <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full border border-line bg-raised text-ink-3">
          <Icon size={19} aria-hidden />
        </div>
      ) : null}
      <p className="font-display text-[1.0625rem] font-medium text-ink">{title}</p>
      {children ? (
        <p className="mx-auto mt-1.5 max-w-sm text-[0.9375rem] leading-relaxed text-ink-2">
          {children}
        </p>
      ) : null}
    </div>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────── */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} aria-hidden />;
}

/* ── Section heading ──────────────────────────────────────────────── */

export function SectionHeading({
  eyebrow,
  title,
  muted,
  lead,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: string;
  /** The muted continuation of the two-tone headline. */
  muted?: string;
  lead?: string;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div
      className={cx(
        align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl",
        className,
      )}
    >
      {eyebrow ? <Eyebrow className="mb-3.5">{eyebrow}</Eyebrow> : null}
      <h2 className="text-[2rem] leading-[1.12] sm:text-[2.5rem]">
        {title}
        {muted ? <span className="headline-mute"> {muted}</span> : null}
      </h2>
      {lead ? (
        <p
          className={cx(
            "mt-4 text-[1.0625rem] leading-relaxed text-ink-2",
            align === "center" && "mx-auto",
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}

export { cx };
