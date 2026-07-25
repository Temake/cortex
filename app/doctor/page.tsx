/**
 * /doctor — the receiving doctor at OAUTHC opens a referral.
 *
 * Accepts a referral token, a raw DTP grant JWT, or a full referral link (the
 * backend normalises all three), then renders the scoped history.
 *
 * A `?token=` query parameter is picked up and submitted automatically, so the
 * QR code and the "Open as the doctor" link both land straight on the history
 * rather than on a form the presenter has to fill in mid-demo.
 */
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  FileText,
  Pill as PillIcon,
  RotateCcw,
  ShieldCheck,
  Stethoscope,
} from "lucide-react";

import { CareEventList, MedicationList, Stat } from "@/components/care-events";
import { PageShell } from "@/components/site-nav";
import {
  Button,
  Card,
  ErrorNote,
  Eyebrow,
  Field,
  Pill,
  Reveal,
  Skeleton,
} from "@/components/ui";
import {
  ApiClientError,
  formatDateTime,
  postJson,
  relativeTime,
  type HistoryResponse,
} from "@/lib/contracts";

function DoctorPortal() {
  const searchParams = useSearchParams();
  const presetToken = searchParams.get("token");

  const [token, setToken] = useState(presetToken ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);

  const load = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setPending(true);
    setError(null);
    try {
      setHistory(await postJson<HistoryResponse>("/api/doctor/history", { grantToken: value.trim() }));
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? { code: err.code, message: err.message }
          : { code: "UNKNOWN", message: "Could not open that referral." },
      );
    } finally {
      setPending(false);
    }
  }, []);

  // Auto-submit a token that arrived in the URL, exactly once.
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (presetToken && !autoLoaded.current) {
      autoLoaded.current = true;
      void load(presetToken);
    }
  }, [presetToken, load]);

  function reset() {
    setHistory(null);
    setToken("");
    setError(null);
  }

  /* ── The paste form ────────────────────────────────────────────── */
  if (!history) {
    return (
      <>
        <Reveal>
          <Eyebrow className="mb-3.5">Doctor · OAUTHC</Eyebrow>
          <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">
            Open a referral,
            <span className="headline-mute"> see the history.</span>
          </h1>
          <p className="mt-4 max-w-xl text-[1.0625rem] leading-relaxed text-ink-2">
            Scan the QR code from the Health Centre, or paste the referral token
            below. You will see only what the referral scoped.
          </p>
        </Reveal>

        <Reveal delay={90}>
          <form
            className="mt-10 space-y-6"
            onSubmit={(e) => {
              e.preventDefault();
              void load(token);
            }}
          >
            {error ? <ErrorNote code={error.code} message={error.message} /> : null}

            <Card className="p-6 sm:p-7">
              <Field
                label="Referral token or link"
                htmlFor="token"
                hint="A CareBridge referral token, a full link, or a raw DTP grant token."
              >
                <textarea
                  id="token"
                  className="input font-mono text-[0.8125rem] leading-relaxed"
                  rows={5}
                  placeholder="cbr1.eyJyZWZlcnJhbElkIjoi…"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
              </Field>
            </Card>

            <Button type="submit" size="lg" pending={pending} disabled={!token.trim()} icon={ShieldCheck}>
              {pending ? "Verifying consent…" : "Open referral"}
            </Button>
          </form>
        </Reveal>

        {pending ? (
          <div className="mt-8 space-y-3" aria-hidden>
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : null}
      </>
    );
  }

  /* ── The history ───────────────────────────────────────────────── */
  const visitCount = history.visits.length;

  return (
    <>
      <Reveal>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow className="mb-3.5">Doctor · OAUTHC</Eyebrow>
            <h1 className="text-[2rem] leading-[1.1] sm:text-[2.5rem]">
              Patient history,
              <span className="headline-mute"> as scoped.</span>
            </h1>
          </div>
          <Button variant="secondary" onClick={reset} icon={RotateCcw}>
            Clear token
          </Button>
        </div>
      </Reveal>

      {/* Consent banner — what this token actually authorised */}
      <Reveal delay={70}>
        <Card className="mt-8 overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-line bg-canvas-soft px-5 py-3.5">
            <ShieldCheck size={15} className="text-ok" aria-hidden />
            <p className="text-[0.9375rem] font-medium">
              {history.tokenKind === "referral" ? "Scoped referral" : "Direct grant token"}
            </p>
            {history.scope.expiresAt ? (
              <Pill tone="ok" icon={CalendarClock} className="ml-auto">
                Expires {relativeTime(history.scope.expiresAt)}
              </Pill>
            ) : null}
          </div>

          <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
            <div>
              <p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
                Reason for referral
              </p>
              <p className="text-[0.9375rem] leading-relaxed text-ink">
                {history.referral?.reason ?? "None given"}
              </p>
              {history.referral ? (
                <p className="mt-2 text-[0.8125rem] text-ink-3">
                  Issued {formatDateTime(history.referral.issuedAt)}
                </p>
              ) : null}
            </div>

            <div>
              <p className="mb-2 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
                Scope
              </p>
              <div className="flex flex-wrap gap-1.5">
                {history.scope.systems?.length ? (
                  history.scope.systems.map((system) => (
                    <Pill key={system} tone="ok">
                      {system}
                    </Pill>
                  ))
                ) : (
                  <Pill tone="warn">All systems</Pill>
                )}
              </div>
              <p className="mt-3 break-all font-mono text-[0.6875rem] text-ink-3">
                twin {history.twinId}
              </p>
            </div>
          </div>
        </Card>
      </Reveal>

      {/* Stats strip */}
      <Reveal delay={130}>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Stat label="Events in scope" value={history.eventCount} />
          <Stat label="Medications" value={history.medications.length} hint="Checked on prescribing" />
          <Stat label="Visits" value={visitCount} hint={visitCount ? "Grouped by visit" : undefined} />
        </div>
      </Reveal>

      {/* Medications first — the prescribing-relevant read */}
      <Reveal delay={180}>
        <Card className="mt-6 p-6 sm:p-7">
          <h2 className="mb-5 flex items-center gap-2.5 text-[1.25rem]">
            <PillIcon size={18} className="text-ink-3" aria-hidden />
            Current medications
          </h2>
          <MedicationList medications={history.medications} />
        </Card>
      </Reveal>

      {/* Full timeline */}
      <Reveal delay={220}>
        <Card className="mt-6 p-6 sm:p-7">
          <h2 className="mb-6 flex items-center gap-2.5 text-[1.25rem]">
            <FileText size={18} className="text-ink-3" aria-hidden />
            Health events
            <Pill className="ml-1">{history.eventCount}</Pill>
          </h2>
          <CareEventList events={history.events} />
        </Card>
      </Reveal>

      <Reveal delay={260}>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/doctor/${history.referral?.referralId ?? "direct"}/prescribe?token=${encodeURIComponent(token)}`}
            className="btn btn-primary btn-lg"
          >
            <Stethoscope size={16} aria-hidden />
            Check a new prescription
            <ArrowRight size={16} aria-hidden />
          </Link>
        </div>
      </Reveal>
    </>
  );
}

export default function DoctorPage() {
  return (
    <PageShell>
      <Suspense
        fallback={
          <div className="space-y-4" aria-hidden>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-12 w-2/3" />
            <Skeleton className="h-32 w-full" />
          </div>
        }
      >
        <DoctorPortal />
      </Suspense>
    </PageShell>
  );
}
