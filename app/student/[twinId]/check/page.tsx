/**
 * /student/[twinId]/check — "is this safe with what I'm already taking?"
 *
 * The pain point: students routinely buy antibiotics and antimalarials from
 * patent medicine vendors with no prescription and no idea what they collide
 * with. Until now the interaction check only existed behind a doctor's
 * referral — the person actually swallowing the drug couldn't reach it.
 *
 * Calls /api/interactions/check with NO token. The route falls back to the
 * student's own twin, which is correct: they own it, so no grant is involved.
 *
 * Result rendering lives in SafetyResult, which is deliberately not the doctor's
 * banner — see that file's header for why the "nothing found" wording matters.
 */
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Pill as PillIcon, Search, ShieldQuestion } from "lucide-react";

import { SafetyResult } from "@/components/safety-result";
import { PageShell } from "@/components/site-nav";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Eyebrow,
  Field,
  Pill,
  Reveal,
  Skeleton,
} from "@/components/ui";
import {
  ApiClientError,
  postJson,
  type InteractionCheckResponse,
  type SummaryResponse,
} from "@/lib/contracts";

/**
 * Commonly self-medicated in Nigeria — bought over the counter without a
 * prescription. Tramadol is first because it is both the most misused and, on
 * this twin, the one that flags MAJOR.
 */
const COMMON = [
  "Tramadol",
  "Metronidazole",
  "Ciprofloxacin",
  "Paracetamol",
  "Ibuprofen",
  "Artemether",
];

export default function StudentCheckPage() {
  const params = useParams<{ twinId: string }>();
  const twinId = params?.twinId ?? "";

  const [drug, setDrug] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const [result, setResult] = useState<InteractionCheckResponse | null>(null);

  // The student's own medication list, loaded up front so the page is useful
  // before they type anything.
  const [meds, setMeds] = useState<SummaryResponse | null>(null);
  const [medsLoading, setMedsLoading] = useState(true);

  /**
   * Prefer the list that came back with a check — those entries carry the
   * HOLON-resolved concept names. Before any check, fall back to the list
   * loaded from /api/summary so the panel is never empty on arrival.
   */
  const shownMeds = result?.existingMeds ?? meds?.medications ?? [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await postJson<SummaryResponse>("/api/summary", { twinId });
        if (!cancelled) setMeds(data);
      } catch {
        // Non-fatal: the check itself still works without this panel.
      } finally {
        if (!cancelled) setMedsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [twinId]);

  const check = useCallback(async (value: string) => {
    const name = value.trim();
    if (!name) return;

    setPending(true);
    setError(null);
    try {
      // No token: the route reads the student's own twin.
      setResult(await postJson<InteractionCheckResponse>("/api/interactions/check", { newDrug: name }));
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? { code: err.code, message: err.message }
          : { code: "UNKNOWN", message: "Could not run the check." },
      );
    } finally {
      setPending(false);
    }
  }, []);

  return (
    <PageShell width="narrow">
      <Reveal>
        <Link
          href={`/student/${twinId}`}
          className="mb-6 inline-flex items-center gap-1.5 text-[0.875rem] text-ink-2 transition-colors hover:text-ink"
        >
          <ArrowLeft size={14} aria-hidden />
          Back to your summary
        </Link>

        <Eyebrow className="mb-3.5">Student · medicine safety</Eyebrow>
        <h1 className="text-[2.25rem] leading-[1.1] sm:text-[2.75rem]">
          Before you take it,
          <span className="headline-mute"> check it.</span>
        </h1>
        <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-2">
          Bought something from a chemist? Type it in and we&apos;ll check it against
          the medicines already on your record.
        </p>
      </Reveal>

      {/* ── The input ─────────────────────────────────────────────────── */}
      <Reveal delay={80}>
        <Card className="mt-9 p-6 sm:p-7">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void check(drug);
            }}
          >
            <Field
              label="What are you about to take?"
              htmlFor="drug"
              hint="Use the generic name in the small print on the packet, not the brand."
            >
              <div className="flex gap-2">
                <input
                  id="drug"
                  className="input"
                  placeholder="Tramadol"
                  value={drug}
                  onChange={(e) => setDrug(e.target.value)}
                  autoComplete="off"
                />
                <Button type="submit" pending={pending} disabled={!drug.trim()} icon={Search}>
                  Check
                </Button>
              </div>
            </Field>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-[0.8125rem] text-ink-3">Common:</span>
            {COMMON.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setDrug(name);
                  void check(name);
                }}
                className="pill transition-colors hover:border-ink-3 hover:text-ink"
              >
                {name}
              </button>
            ))}
          </div>
        </Card>
      </Reveal>

      {error ? (
        <div className="mt-6">
          <ErrorNote code={error.code} message={error.message} />
        </div>
      ) : null}

      {pending && !result ? (
        <div className="mt-6" aria-hidden>
          <Skeleton className="h-32 w-full" />
        </div>
      ) : null}

      {result ? (
        <div className="mt-6">
          <SafetyResult result={result} />
        </div>
      ) : null}

      {/* ── What's already on their record ────────────────────────────── */}
      <Reveal delay={140}>
        <Card className="mt-6 overflow-hidden">
          <div className="flex items-center gap-2.5 border-b border-line bg-canvas-soft px-5 py-4">
            <PillIcon size={15} className="text-ink-3" aria-hidden />
            <p className="text-[0.9375rem] font-medium">What&apos;s already on your record</p>
          </div>

          {medsLoading ? (
            <div className="space-y-2 p-5" aria-hidden>
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : shownMeds.length ? (
            <ul className="list-none divide-y divide-line-soft p-0">
              {shownMeds.map((med) => (
                <li key={med.eventId} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="truncate text-[0.9375rem] text-ink">{med.name}</span>
                  {med.conceptName && med.conceptName !== med.name ? (
                    <Pill mono>{med.conceptName}</Pill>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={PillIcon} title="Nothing recorded yet">
              Once a nurse logs a visit at the Health Centre, your medicines appear
              here.
            </EmptyState>
          )}
        </Card>
      </Reveal>

      {/* ── The limits of this tool, stated plainly ───────────────────── */}
      <Reveal delay={190}>
        <Card className="mt-6 p-6">
          <h2 className="flex items-center gap-2.5 text-[1.0625rem]">
            <ShieldQuestion size={16} className="text-ink-3" aria-hidden />
            What this can and can&apos;t tell you
          </h2>
          <ul className="mt-3.5 list-none space-y-2.5 p-0">
            {[
              "It only knows what's on your record. If you took something that was never logged, it can't see it.",
              "It checks drug-against-drug only — not your dose, your allergies, your kidneys, or whether you're pregnant.",
              "A clear result is not clearance. The database doesn't cover every possible pair.",
              "It is not a substitute for a pharmacist. It's a reason to go and ask one.",
            ].map((text) => (
              <li key={text} className="flex gap-3 text-[0.9375rem] leading-relaxed text-ink-2">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-ink-3" aria-hidden />
                {text}
              </li>
            ))}
          </ul>
        </Card>
      </Reveal>
    </PageShell>
  );
}
