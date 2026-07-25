/**
 * Twin history rendering — the doctor's read of the patient record.
 *
 * Presented as a timeline rather than a table: the clinical question during the
 * demo is "what happened, and when", and a rail makes recency legible at a
 * glance. Events written by CareBridge are marked so a doctor can tell this
 * visit's data from history that was already on the twin.
 */
"use client";

import {
  Activity,
  FileText,
  FlaskConical,
  Pill as PillIcon,
  Stethoscope,
  Syringe,
  TriangleAlert,
  Watch,
  type LucideIcon,
} from "lucide-react";

import { formatDate, relativeTime, type CareEvent, type MedicationRecord, type Vitals } from "@/lib/contracts";
import { Card, Dot, EmptyState, Pill, cx } from "./ui";

const EVENT_ICON: Record<string, LucideIcon> = {
  vital_sign: Activity,
  medication: PillIcon,
  diagnosis: Stethoscope,
  symptom: TriangleAlert,
  lab_result: FlaskConical,
  clinical_note: FileText,
  device_reading: Watch,
  immunisation: Syringe,
};

function iconFor(eventType: string): LucideIcon {
  return EVENT_ICON[eventType] ?? FileText;
}

function toneFor(eventType: string): "ok" | "warn" | "info" | "idle" {
  if (eventType === "medication") return "info";
  if (eventType === "vital_sign" || eventType === "lab_result") return "ok";
  if (eventType === "symptom" || eventType === "diagnosis") return "warn";
  return "idle";
}

/* ── Vitals ───────────────────────────────────────────────────────── */

const VITAL_LABELS: Array<{ key: keyof Vitals; label: string; unit: string }> = [
  { key: "temp", label: "Temp", unit: "°C" },
  { key: "bp", label: "BP", unit: "" },
  { key: "hr", label: "HR", unit: "bpm" },
  { key: "rr", label: "RR", unit: "/min" },
  { key: "spo2", label: "SpO₂", unit: "%" },
];

export function VitalsGrid({ vitals, className }: { vitals: Vitals; className?: string }) {
  const present = VITAL_LABELS.filter(
    ({ key }) => vitals[key] !== undefined && vitals[key] !== null && vitals[key] !== "",
  );
  if (!present.length) return null;

  return (
    <div className={cx("mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {present.map(({ key, label, unit }) => (
        <div key={key} className="rounded-xl border border-line bg-canvas-soft px-3 py-2.5">
          <p className="mb-1 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
            {label}
          </p>
          <p className="font-display text-[1.0625rem] font-semibold leading-none text-ink">
            {String(vitals[key])}
            {unit ? <span className="ml-0.5 text-[0.6875rem] font-normal text-ink-3">{unit}</span> : null}
          </p>
        </div>
      ))}
    </div>
  );
}

/* ── One event ────────────────────────────────────────────────────── */

function EventRow({ event, last }: { event: CareEvent; last: boolean }) {
  const Icon = iconFor(event.eventType);

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {/* rail */}
      {!last ? (
        <span
          className="absolute left-[17px] top-9 bottom-0 w-px bg-line"
          aria-hidden
        />
      ) : null}

      <span
        className={cx(
          "relative z-10 flex size-9 shrink-0 items-center justify-center rounded-full border bg-surface",
          event.fromCareBridge ? "border-ink/25 text-ink" : "border-line text-ink-3",
        )}
      >
        <Icon size={15} aria-hidden />
      </span>

      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="font-medium text-ink">{event.title || event.code}</p>
          <time
            dateTime={event.occurredAt}
            title={event.occurredAt}
            className="shrink-0 text-[0.8125rem] text-ink-3"
          >
            {formatDate(event.occurredAt)}
          </time>
        </div>

        {event.code === "VITALS" && event.vitals ? (
          <VitalsGrid vitals={event.vitals} />
        ) : event.value ? (
          <p className="mt-1 text-[0.9375rem] leading-relaxed text-ink-2">
            {event.value}
            {event.unit ? ` ${event.unit}` : ""}
          </p>
        ) : null}

        {event.description && event.description !== event.value ? (
          <p className="mt-1 text-[0.875rem] leading-relaxed text-ink-3">{event.description}</p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Pill>
            <Dot tone={toneFor(event.eventType)} />
            {event.system}
          </Pill>
          <Pill mono>{event.eventType}</Pill>
          {event.conceptName ? (
            <Pill tone="info" mono>
              {event.conceptName}
              {event.vocabularyId ? ` · ${event.vocabularyId}` : ""}
            </Pill>
          ) : null}
          {event.hostel ? <Pill>{event.hostel}</Pill> : null}
        </div>
      </div>
    </li>
  );
}

/* ── The list ─────────────────────────────────────────────────────── */

export function CareEventList({
  events,
  className,
}: {
  events: CareEvent[];
  className?: string;
}) {
  if (!events.length) {
    return (
      <EmptyState icon={FileText} title="No events in scope">
        This referral&apos;s scope did not include any events, or the twin has no history yet.
      </EmptyState>
    );
  }

  return (
    <ol className={cx("list-none p-0", className)}>
      {events.map((event, index) => (
        <EventRow key={event.id} event={event} last={index === events.length - 1} />
      ))}
    </ol>
  );
}

/* ── Current medications ──────────────────────────────────────────── */

export function MedicationList({
  medications,
  className,
}: {
  medications: MedicationRecord[];
  className?: string;
}) {
  if (!medications.length) {
    return (
      <EmptyState icon={PillIcon} title="No medications on record">
        There is nothing to check a new prescription against yet.
      </EmptyState>
    );
  }

  return (
    <ul className={cx("list-none space-y-2 p-0", className)}>
      {medications.map((med) => (
        <li
          key={med.eventId}
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 transition-colors hover:border-line-strong"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-2.5 font-medium text-ink">
              <PillIcon size={14} className="shrink-0 text-ink-3" aria-hidden />
              <span className="truncate">{med.name}</span>
            </p>
            {med.conceptName && med.conceptName !== med.name ? (
              <p className="mt-0.5 pl-[1.625rem] text-[0.8125rem] text-ink-3">
                Resolved to {med.conceptName}
              </p>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {med.conceptId ? (
              <Pill mono>#{med.conceptId}</Pill>
            ) : (
              <Pill tone="warn">Unresolved</Pill>
            )}
            <span className="text-[0.8125rem] text-ink-3">{relativeTime(med.occurredAt)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ── A small labelled statistic, used in summary strips ───────────── */

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <p className="mb-1.5 font-mono text-[0.625rem] uppercase tracking-widest text-ink-3">
        {label}
      </p>
      <p className="font-display text-[1.5rem] font-semibold leading-none tracking-tight text-ink">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-[0.8125rem] text-ink-3">{hint}</p> : null}
    </Card>
  );
}
