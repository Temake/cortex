/**
 * /intake/[visitId]/refer — the nurse hands the visit over to OAUTHC.
 *
 * Posts to /api/refer, which mints a scoped, time-boxed referral token. The
 * token is shown as a QR code plus a copyable link so the receiving doctor can
 * "scan" it during the demo by opening the link or pasting the token.
 *
 * What the QR encodes is the referral link, never the underlying sandbox grant
 * token — that stays server-side.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  CalendarClock,
  Check,
  QrCode,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { PageShell } from "@/components/site-nav";
import {
  Button,
  Card,
  CopyButton,
  ErrorNote,
  Eyebrow,
  Field,
  Pill,
  Reveal,
} from "@/components/ui";
import {
  ApiClientError,
  formatDateTime,
  postJson,
  relativeTime,
  type ReferResponse,
} from "@/lib/contracts";

const TTL_OPTIONS = [
  { value: "24", label: "24 hours" },
  { value: "48", label: "48 hours" },
  { value: "72", label: "72 hours" },
];

export default function ReferPage() {
  const params = useParams<{ visitId: string }>();
  const visitId = params?.visitId ?? "";

  const [reason, setReason] = useState("");
  const [ttlHours, setTtlHours] = useState("48");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [result, setResult] = useState<ReferResponse | null>(null);

  async function generate(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      setResult(
        await postJson<ReferResponse>("/api/refer", {
          visitId,
          reason: reason.trim() || undefined,
          ttlHours: Number(ttlHours),
        }),
      );
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? { code: err.code, message: err.message }
          : { code: "UNKNOWN", message: "Could not create the referral." },
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <PageShell width={result ? "wide" : "narrow"}>
      <Reveal>
        <Eyebrow className="mb-3.5">Nurse · step 2 of 2</Eyebrow>
        <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">
          {result ? "Referral ready." : "Refer to OAUTHC,"}
          <span className="headline-mute">
            {result ? " Hand it over." : " with scoped consent."}
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-2">
          {result
            ? "The receiving doctor can scan this code, open the link, or paste the token. It expires on its own."
            : "This creates a consent token limited to the systems this visit touched, valid for a fixed window."}
        </p>
      </Reveal>

      {/* ── Before: the form ─────────────────────────────────────────── */}
      {!result ? (
        <Reveal delay={90}>
          <form onSubmit={generate} className="mt-10 space-y-6">
            {error ? <ErrorNote code={error.code} message={error.message} /> : null}

            <Card className="p-6 sm:p-7">
              <Field
                label="Reason for referral"
                htmlFor="reason"
                hint="Optional. Shown to the receiving doctor when they open the referral."
                className="mb-6"
              >
                <textarea
                  id="reason"
                  className="input"
                  placeholder="Persistent fever, needs review at OAUTHC…"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </Field>

              <Field label="Valid for" htmlFor="ttl" hint="The token stops working after this.">
                <select
                  id="ttl"
                  className="input"
                  value={ttlHours}
                  onChange={(e) => setTtlHours(e.target.value)}
                >
                  {TTL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="mt-6 rounded-xl border border-line bg-canvas-soft p-4">
                <p className="mb-1 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
                  Visit
                </p>
                <p className="break-all font-mono text-[0.8125rem] text-ink-2">{visitId}</p>
              </div>
            </Card>

            <Button type="submit" size="lg" pending={pending} icon={ShieldCheck}>
              {pending ? "Creating referral…" : "Create referral"}
            </Button>
          </form>
        </Reveal>
      ) : (
        /* ── After: the handoff ───────────────────────────────────────── */
        <div className="mt-10 grid gap-6 lg:grid-cols-[auto_1fr] lg:gap-8">
          <Reveal>
            <Card className="p-6 text-center sm:p-8">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-ok-line bg-ok-soft px-3 py-1.5 text-[0.8125rem] font-medium text-ok">
                <Check size={13} aria-hidden />
                Consent issued
              </div>

              <div className="mx-auto w-fit rounded-2xl border border-line bg-white p-5">
                <QRCodeSVG
                  value={result.link}
                  size={196}
                  level="M"
                  marginSize={0}
                  fgColor="#17191b"
                  bgColor="#ffffff"
                />
              </div>

              <p className="mx-auto mt-5 flex max-w-[15rem] items-center justify-center gap-2 text-[0.8125rem] leading-relaxed text-ink-3">
                <QrCode size={14} className="shrink-0" aria-hidden />
                Scan from the OAUTHC device to open the referral
              </p>
            </Card>
          </Reveal>

          <Reveal delay={100} className="space-y-6">
            {/* Expiry */}
            <Card className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
                    Expires
                  </p>
                  <p className="font-display text-[1.25rem] font-semibold tracking-tight">
                    {relativeTime(result.expiresAt)}
                  </p>
                  <p className="mt-1 text-[0.8125rem] text-ink-3">
                    {formatDateTime(result.expiresAt)}
                  </p>
                </div>
                <Pill tone="ok" icon={CalendarClock}>
                  {result.expiresInHours}h window
                </Pill>
              </div>
            </Card>

            {/* Link */}
            <Card className="p-6">
              <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
                Shareable link
              </p>
              <p className="mb-4 break-all rounded-xl border border-line bg-canvas-soft p-3.5 font-mono text-[0.8125rem] leading-relaxed text-ink-2">
                {result.link}
              </p>
              <div className="flex flex-wrap gap-2">
                <CopyButton value={result.link} label="Copy link" />
                <CopyButton value={result.grantToken} label="Copy token only" />
              </div>
            </Card>

            {/* Scope */}
            <Card className="p-6">
              <p className="mb-3 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
                Scope granted
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.scope.systems?.length ? (
                  result.scope.systems.map((system) => (
                    <Pill key={system} tone="ok">
                      {system}
                    </Pill>
                  ))
                ) : (
                  <Pill tone="warn">All systems</Pill>
                )}
                {result.scope.eventTypes?.map((type) => (
                  <Pill key={type} mono>
                    {type}
                  </Pill>
                ))}
              </div>
              <p className="mt-4 text-[0.8125rem] leading-relaxed text-ink-3">
                Referral <span className="font-mono">{result.referralId.slice(0, 8)}</span> ·{" "}
                {result.visit.eventCount} event
                {result.visit.eventCount === 1 ? "" : "s"} from this visit.
              </p>
            </Card>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/doctor?token=${encodeURIComponent(result.grantToken)}`}
                className="btn btn-primary"
              >
                <Stethoscope size={16} aria-hidden />
                Open as the doctor
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link href="/intake" className="btn btn-secondary">
                Log another visit
              </Link>
            </div>
          </Reveal>
        </div>
      )}
    </PageShell>
  );
}
