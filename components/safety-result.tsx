/**
 * The student-facing result of a self-medication safety check.
 *
 * Deliberately NOT the doctor's InteractionAlert. That component leads with
 * severity words and prints HOLON's `management` text verbatim — which reads
 * "Review interaction; adjust therapy as needed". That is written for a
 * prescriber, and to a student it is both opaque and useless as an instruction.
 * Here the headline is an ACTION ("don't take this yet"), and the clinical detail
 * is available underneath for anyone who wants it.
 *
 * THE IMPORTANT PART — the "nothing found" state.
 * HOLON's interaction table is real but uneven: warfarin + ibuprofen, the
 * textbook pair, is genuinely absent from it. So an empty result cannot be
 * rendered as "safe". It is rendered as "we found nothing, which is not the same
 * as safe", because a student will act on this screen.
 */
"use client";

import { useState } from "react";
import {
  ChevronDown,
  CircleAlert,
  Info,
  MessageCircleWarning,
  OctagonAlert,
  ShieldQuestion,
  type LucideIcon,
} from "lucide-react";

import {
  normaliseSeverity,
  type InteractionCheckResponse,
  type Severity,
} from "@/lib/contracts";
import { Pill, cx } from "./ui";

type Verdict = {
  alert: string;
  icon: LucideIcon;
  /** The action, in the second person. This is the headline. */
  headline: string;
  /** One plain-language sentence under the headline. */
  advice: string;
  tone: "danger" | "warn" | "info" | "neutral";
};

const VERDICT: Record<Severity | "clear", Verdict> = {
  contraindicated: {
    alert: "alert-major",
    icon: OctagonAlert,
    headline: "Do not take this",
    advice:
      "This should not be combined with something you are already taking. Speak to a pharmacist or the Health Centre before you take any of it.",
    tone: "danger",
  },
  major: {
    alert: "alert-major",
    icon: OctagonAlert,
    headline: "Don't take this yet",
    advice:
      "This can react badly with something already on your record. Show this screen to a pharmacist or the Health Centre first.",
    tone: "danger",
  },
  moderate: {
    alert: "alert-moderate",
    icon: MessageCircleWarning,
    headline: "Check before you take it",
    advice:
      "There is a known interaction with something you are already taking. It may still be fine, but a pharmacist should decide that, not this app.",
    tone: "warn",
  },
  minor: {
    alert: "alert-minor",
    icon: Info,
    headline: "Worth mentioning",
    advice:
      "There is a minor known interaction. Mention it next time you see a pharmacist or a doctor, and watch how you feel.",
    tone: "info",
  },
  unknown: {
    alert: "alert-moderate",
    icon: CircleAlert,
    headline: "Check before you take it",
    advice:
      "An interaction is recorded but not graded. Ask a pharmacist before taking this.",
    tone: "warn",
  },
  clear: {
    alert: "alert-neutral",
    icon: ShieldQuestion,
    // NOT "safe" — see the file header.
    headline: "Nothing found — but that isn't a green light",
    advice:
      "No known interaction came back for this combination. That is not the same as safe: the database does not cover every pair, and it knows nothing about your allergies, your kidneys, or your dose.",
    tone: "neutral",
  },
};

export function SafetyResult({ result }: { result: InteractionCheckResponse }) {
  const [showClinical, setShowClinical] = useState(false);

  const severity: Severity | "clear" = result.hasInteraction
    ? normaliseSeverity(result.severity)
    : "clear";
  const verdict = VERDICT[severity];
  const Icon = verdict.icon;
  const drugLabel = result.newDrug.conceptName ?? result.newDrug.query;

  // Could not resolve the name at all — a distinct, non-alarming state.
  if (!result.resolvedNewDrug) {
    return (
      <div className="alert alert-neutral animate-fade-up" role="status">
        <div className="flex items-start gap-3.5">
          <ShieldQuestion size={22} className="mt-0.5 shrink-0" aria-hidden />
          <div>
            <h2 className="font-display text-[1.375rem] font-semibold tracking-tight">
              We don&apos;t recognise that name
            </h2>
            <p className="mt-2 text-[0.9375rem] leading-relaxed">
              Try the generic name printed on the packet — the small print, not the
              brand. For example &ldquo;artemether&rdquo; rather than a brand name.
              If you still can&apos;t find it, take the packet to a pharmacist.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cx("alert animate-fade-up", verdict.alert)} role="alert" aria-live="polite">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 shrink-0">
          <Icon size={24} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[1.5rem] font-semibold leading-tight tracking-tight">
            {verdict.headline}
          </h2>

          <p className="mt-2.5 text-[1rem] leading-relaxed">{verdict.advice}</p>

          {/* What was compared, in plain terms. */}
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <Pill tone={verdict.tone === "neutral" ? "neutral" : verdict.tone}>
              {drugLabel}
            </Pill>
            <span className="text-[0.875rem] opacity-70">
              checked against {result.existingMeds.length}{" "}
              {result.existingMeds.length === 1 ? "medicine" : "medicines"} on your record
            </span>
          </div>

          {/* Which of their medicines it clashed with, named plainly. */}
          {result.interactions.length ? (
            <ul className="mt-4 list-none space-y-1.5 p-0">
              {result.interactions.map((pair) => (
                <li
                  key={`${pair.drugA}-${pair.drugB}`}
                  className="flex flex-wrap items-center gap-2 text-[0.9375rem]"
                >
                  <span className="font-medium">
                    {pair.drugAName} + {pair.drugBName}
                  </span>
                  <Pill tone={verdict.tone === "neutral" ? "neutral" : verdict.tone}>
                    {pair.severity}
                  </Pill>
                </li>
              ))}
            </ul>
          ) : null}

          {/* The clinical detail, available but not leading. */}
          {result.interactions.length ? (
            <>
              <button
                type="button"
                onClick={() => setShowClinical((v) => !v)}
                aria-expanded={showClinical}
                className="mt-4 inline-flex items-center gap-1.5 text-[0.875rem] font-medium underline decoration-current/30 underline-offset-2 transition-opacity hover:opacity-70"
              >
                <ChevronDown
                  size={14}
                  className={cx("transition-transform duration-300", showClinical && "rotate-180")}
                  aria-hidden
                />
                {showClinical ? "Hide the clinical detail" : "Show the clinical detail"}
              </button>

              {showClinical ? (
                <div className="mt-3 space-y-3 animate-fade-in">
                  {result.interactions.map((pair) => (
                    <div
                      key={`detail-${pair.drugA}-${pair.drugB}`}
                      className="rounded-xl border border-current/15 bg-white/50 p-4 text-[0.875rem] leading-relaxed"
                    >
                      <p>{pair.clinicalEffect}</p>
                      {pair.mechanism ? (
                        <p className="mt-2 opacity-80">{pair.mechanism}</p>
                      ) : null}
                      <p className="mt-2 opacity-80">
                        <span className="font-medium">Clinical guidance: </span>
                        {pair.management}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1.5 opacity-70">
                        <Pill mono>{pair.source}</Pill>
                        <Pill mono>evidence: {pair.evidenceGrade}</Pill>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
