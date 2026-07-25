/**
 * The drug-interaction result banner.
 *
 * This is the clinical payoff of the demo, so severity has to read before any
 * text does: the banner is colour- and edge-weighted by severity, the severity
 * word is the largest element, and `management` (the actionable line) sits above
 * the mechanism detail rather than buried under it.
 *
 * `knowledgeSource` is surfaced deliberately. When HOLON is unreachable the
 * backend falls back to an offline reference table, and a clinician-facing
 * screen must never imply live clinical data that it did not get.
 */
"use client";

import { useState } from "react";
import {
  ChevronDown,
  CircleCheck,
  Info,
  ShieldAlert,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";

import {
  normaliseSeverity,
  type InteractionCheckResponse,
  type InteractionPair,
  type Severity,
} from "@/lib/contracts";
import { Pill, cx } from "./ui";

const SEVERITY_STYLE: Record<
  Severity | "clear",
  { alert: string; icon: LucideIcon; label: string; tone: "danger" | "warn" | "info" | "ok" }
> = {
  contraindicated: { alert: "alert-major", icon: ShieldAlert, label: "Contraindicated", tone: "danger" },
  major: { alert: "alert-major", icon: TriangleAlert, label: "Major", tone: "danger" },
  moderate: { alert: "alert-moderate", icon: TriangleAlert, label: "Moderate", tone: "warn" },
  minor: { alert: "alert-minor", icon: Info, label: "Minor", tone: "info" },
  unknown: { alert: "alert-neutral", icon: Info, label: "Unclassified", tone: "info" },
  clear: { alert: "alert-clear", icon: CircleCheck, label: "No interaction", tone: "ok" },
};

function SourceBadge({
  source,
  offlineOnlyCount = 0,
}: {
  source: InteractionCheckResponse["knowledgeSource"];
  offlineOnlyCount?: number;
}) {
  if (source === "holon") {
    return (
      <Pill tone="ok" mono>
        HOLON live
      </Pill>
    );
  }

  if (source === "mixed") {
    return (
      <Pill
        tone="warn"
        mono
        title={`Checked live against HOLON, except ${offlineOnlyCount} medication(s) HOLON could not resolve, which were checked against the offline table instead.`}
      >
        HOLON live + {offlineOnlyCount} offline
      </Pill>
    );
  }

  return (
    <Pill tone="warn" mono title="HOLON was unreachable; this came from the offline reference table.">
      Offline reference
    </Pill>
  );
}

function PairDetail({ pair }: { pair: InteractionPair }) {
  const [open, setOpen] = useState(false);
  const severity = normaliseSeverity(pair.severity);
  const style = SEVERITY_STYLE[severity];

  return (
    <div className="rounded-xl border border-current/15 bg-white/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Pill tone={style.tone}>{style.label}</Pill>
        <p className="font-medium">
          {pair.drugAName} <span className="opacity-50">+</span> {pair.drugBName}
        </p>
      </div>

      <p className="mt-2.5 text-[0.9375rem] leading-relaxed">{pair.clinicalEffect}</p>

      <p className="mt-3 text-[0.9375rem] leading-relaxed">
        <span className="font-medium">What to do: </span>
        {pair.management}
      </p>

      {pair.mechanism ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium underline decoration-current/30 underline-offset-2 transition-opacity hover:opacity-70"
          >
            <ChevronDown
              size={13}
              className={cx("transition-transform duration-300", open && "rotate-180")}
              aria-hidden
            />
            {open ? "Hide mechanism" : "Why it happens"}
          </button>

          <div
            className={cx(
              "grid transition-all duration-400 ease-out",
              open ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            )}
          >
            <p className="overflow-hidden text-[0.875rem] leading-relaxed opacity-80">
              {pair.mechanism}
            </p>
          </div>
        </>
      ) : null}

      <div className="mt-3.5 flex flex-wrap items-center gap-1.5 opacity-70">
        <Pill mono>evidence: {pair.evidenceGrade}</Pill>
        <Pill mono>{pair.source}</Pill>
      </div>
    </div>
  );
}

export function InteractionAlert({ result }: { result: InteractionCheckResponse }) {
  const severity: Severity | "clear" = result.hasInteraction
    ? normaliseSeverity(result.severity)
    : "clear";
  const style = SEVERITY_STYLE[severity];
  const Icon = style.icon;

  const drugLabel = result.newDrug.conceptName ?? result.newDrug.query;

  return (
    <div className={cx("alert animate-fade-up", style.alert)} role="alert" aria-live="polite">
      <div className="flex items-start gap-3.5">
        <span className="mt-0.5 shrink-0">
          <Icon size={22} aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="font-display text-[1.375rem] font-semibold tracking-tight">
              {result.hasInteraction ? `${style.label} interaction` : "No interaction found"}
            </h3>
            <SourceBadge
              source={result.knowledgeSource}
              offlineOnlyCount={result.offlineOnlyCount}
            />
            {!result.resolvedNewDrug ? <Pill tone="warn">Drug not recognised</Pill> : null}
          </div>

          <p className="mt-2 text-[0.9375rem] leading-relaxed">{result.description}</p>

          {/* What was actually checked — keeps the demo honest and legible. */}
          <div className="mt-3.5 flex flex-wrap items-center gap-1.5">
            <Pill tone={result.hasInteraction ? "danger" : "ok"}>New: {drugLabel}</Pill>
            {result.newDrug.conceptId ? (
              <Pill mono>#{result.newDrug.conceptId}</Pill>
            ) : null}
            <span className="text-[0.8125rem] opacity-70">
              checked against {result.existingMeds.length}{" "}
              {result.existingMeds.length === 1 ? "medication" : "medications"}
            </span>
          </div>

          {result.interactions.length ? (
            <div className="mt-4 space-y-2.5">
              {result.interactions.map((pair) => (
                <PairDetail key={`${pair.drugA}-${pair.drugB}`} pair={pair} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Interactions that already existed between the patient's current medications,
 * shown separately so they are not misread as caused by the new prescription.
 */
export function ExistingInteractions({ pairs }: { pairs: InteractionPair[] }) {
  if (!pairs.length) return null;

  return (
    <div className="alert alert-neutral">
      <div className="flex items-start gap-3">
        <Info size={18} className="mt-0.5 shrink-0" aria-hidden />
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-[1.0625rem] font-semibold text-ink">
            Already present between current medications
          </h3>
          <p className="mt-1 text-[0.875rem]">
            Not caused by this prescription, but worth knowing.
          </p>
          <div className="mt-3 space-y-2.5">
            {pairs.map((pair) => (
              <PairDetail key={`${pair.drugA}-${pair.drugB}`} pair={pair} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
