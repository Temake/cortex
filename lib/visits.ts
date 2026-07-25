/**
 * Intake writes and twin-event reads.
 *
 * IMPORTANT DEVIATION FROM THE BUILD SCOPE, and why:
 * the scope document specifies `twin.events.create()`. That method does not
 * exist — `twin.events` only exposes `list()` and `stream()`. The SDK's write
 * path for a twin is `twin.flag(system, input)`, which POSTs to the same
 * `/provider/twins/:id/events` endpoint the scope was describing. So every
 * "create an event" below is a `twin.flag()` call.
 *
 * One consequence shapes the data model: `flag()` moves a top-level `code` /
 * `value` into `data.flaggedCode` / `data.flaggedValue`, but spreads anything
 * in `data` through untouched. We therefore pass all clinical fields inside
 * `data`, so events read back as a clean `data.code` / `data.value` on both
 * the doctor view and the summary route.
 */
import type { HealthEvent, Twin } from "@ontomorph/dtp-sdk";

import { DOMAIN, resolveConcept, type KnowledgeSource } from "./holon";

/** Body systems this app writes to. Used verbatim as referral scope. */
export const CARE_SYSTEMS = {
  complaint: "general",
  vitals: "cardiovascular",
  medication: "medication",
} as const;

export const ALL_CARE_SYSTEMS = Object.values(CARE_SYSTEMS);

/** Event types accepted by the platform (validated server-side against an enum). */
export const CARE_EVENT_TYPES = {
  complaint: "diagnosis",
  vitals: "vital_sign",
  medication: "medication",
} as const;

export const ALL_CARE_EVENT_TYPES = [...new Set(Object.values(CARE_EVENT_TYPES))];

/** Tag on every event this app writes, so we can tell ours from seeded demo data. */
export const APP_TAG = "cortex-oau";

/**
 * The tag this app used before it was renamed. Events already on the sandbox
 * twin carry it, and they are still ours — so reads accept both. Writes only
 * ever use APP_TAG.
 */
const LEGACY_APP_TAGS = ["carebridge-oau"];

export type Vitals = {
  temp?: string | number | null;
  bp?: string | null;
  hr?: string | number | null;
  rr?: string | number | null;
  spo2?: string | number | null;
};

export type IntakeInput = {
  complaint: string;
  vitals?: Vitals;
  medsGiven?: string[] | string;
  hostel?: string | null;
};

/** The event shape the frontend renders. Stable — do not reorder or rename. */
export type CareEvent = {
  id: string;
  eventType: string;
  system: string;
  code: string;
  value: string;
  unit: string | null;
  title: string;
  description: string | null;
  occurredAt: string;
  recordedAt: string;
  visitId: string | null;
  hostel: string | null;
  conceptId: number | null;
  conceptName: string | null;
  vocabularyId: string | null;
  /** Structured vitals, present only on a VITALS event. */
  vitals: Vitals | null;
  /** True when this event was written by Cortex rather than pre-existing twin data. */
  fromCortex: boolean;
};

function str(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value);
}

/** Human-readable one-liner for a vitals set, used as the event's `value`. */
export function formatVitals(vitals: Vitals): string {
  const parts: string[] = [];
  if (vitals.temp != null && vitals.temp !== "") parts.push(`Temp ${vitals.temp}°C`);
  if (vitals.bp) parts.push(`BP ${vitals.bp}`);
  if (vitals.hr != null && vitals.hr !== "") parts.push(`HR ${vitals.hr} bpm`);
  if (vitals.rr != null && vitals.rr !== "") parts.push(`RR ${vitals.rr}/min`);
  if (vitals.spo2 != null && vitals.spo2 !== "") parts.push(`SpO₂ ${vitals.spo2}%`);
  return parts.join(" · ") || "No vitals recorded";
}

export function hasAnyVital(vitals: Vitals | undefined | null): boolean {
  if (!vitals) return false;
  return [vitals.temp, vitals.bp, vitals.hr, vitals.rr, vitals.spo2].some(
    (v) => v !== undefined && v !== null && v !== "",
  );
}

/** Accept `medsGiven` as an array, a newline list, or a comma-separated string. */
export function normaliseMeds(input: IntakeInput["medsGiven"]): string[] {
  if (!input) return [];
  const list = Array.isArray(input) ? input : String(input).split(/[\n,;]+/);
  return list.map((m) => String(m).trim()).filter(Boolean);
}

/**
 * Translate one raw `HealthEvent` into the flat shape the frontend renders.
 * Tolerant by design: pre-existing sandbox events use different `data` keys
 * than ours, and the doctor view still needs to show them.
 */
export function toCareEvent(event: HealthEvent): CareEvent {
  const data = (event.data ?? {}) as Record<string, unknown>;

  // Ours use data.code/data.value; flag()-written events elsewhere on the twin
  // use flaggedCode/flaggedValue; seeded demo events use neither.
  const code =
    str(data.code) ?? str(data.flaggedCode) ?? str(data.symptomType) ?? event.eventType.toUpperCase();
  const value =
    str(data.value) ??
    str(data.flaggedValue) ??
    str(data.symptomName) ??
    (data.severity != null ? `Severity ${data.severity}` : null) ??
    event.title ??
    "";

  return {
    id: event.id,
    eventType: event.eventType,
    system: str(data.system) ?? "general",
    code,
    value,
    unit: str(data.unit),
    title: event.title ?? code,
    description: str(event.description),
    occurredAt: event.occurredAt,
    recordedAt: event.recordedAt,
    visitId: str(data.visitId),
    hostel: str(data.hostel),
    conceptId: typeof data.conceptId === "number" ? data.conceptId : null,
    conceptName: str(data.conceptName),
    vocabularyId: str(data.vocabularyId),
    vitals: (data.vitals as Vitals) ?? null,
    fromCortex:
      typeof data.app === "string" &&
      (data.app === APP_TAG || LEGACY_APP_TAGS.includes(data.app)),
  };
}

/**
 * Drop scratch events written while probing the sandbox API. They are not
 * clinical data and should never appear in a doctor's history view.
 */
export function isNoiseEvent(event: CareEvent): boolean {
  return event.code === "PROBE";
}

export function sortNewestFirst(events: CareEvent[]): CareEvent[] {
  return [...events].sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

/** Read the twin's events and return them in frontend shape, newest first. */
export async function readCareEvents(twin: Twin, limit = 200): Promise<CareEvent[]> {
  const raw = await twin.events.list({ limit });
  return sortNewestFirst(raw.map(toCareEvent).filter((e) => !isNoiseEvent(e)));
}

export type MedicationRecord = {
  eventId: string;
  name: string;
  conceptId: number | null;
  conceptName: string | null;
  occurredAt: string;
};

/**
 * The twin's current medication list, most recent first.
 *
 * Matches both the events Cortex writes (`code === "MEDICATION"`) and any
 * pre-existing medication events already on the twin, so the interaction check
 * runs against the patient's whole record rather than only this app's writes.
 */
export function extractMedications(events: CareEvent[]): MedicationRecord[] {
  return sortNewestFirst(
    events.filter((e) => e.code === "MEDICATION" || e.eventType === "medication"),
  ).map((e) => ({
    eventId: e.id,
    name: e.value || e.conceptName || e.title,
    conceptId: e.conceptId,
    conceptName: e.conceptName,
    occurredAt: e.occurredAt,
  }));
}

/** Group events into visits by `data.visitId`, newest visit first. */
export function groupVisits(events: CareEvent[]): Array<{ visitId: string; events: CareEvent[]; occurredAt: string }> {
  const byVisit = new Map<string, CareEvent[]>();
  for (const event of events) {
    if (!event.visitId) continue;
    const bucket = byVisit.get(event.visitId);
    if (bucket) bucket.push(event);
    else byVisit.set(event.visitId, [event]);
  }

  return [...byVisit.entries()]
    .map(([visitId, visitEvents]) => ({
      visitId,
      events: sortNewestFirst(visitEvents),
      occurredAt: sortNewestFirst(visitEvents)[0].occurredAt,
    }))
    .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
}

export type IntakeResult = {
  visitId: string;
  events: CareEvent[];
  knowledgeSource: KnowledgeSource | null;
};

/**
 * Write one intake visit onto the twin: the complaint, the vitals, and one
 * event per medication given. Codes are resolved through HOLON where possible
 * so the doctor and student views can show real clinical concept names.
 */
export async function writeIntake(
  twin: Twin,
  input: IntakeInput,
  visitId: string,
): Promise<IntakeResult> {
  const occurredAt = new Date().toISOString();
  const hostel = input.hostel?.trim() || null;
  const meds = normaliseMeds(input.medsGiven);
  const written: HealthEvent[] = [];
  let knowledgeSource: KnowledgeSource | null = null;

  const base = { visitId, hostel, app: APP_TAG, recordedBy: "nurse" as const };

  // 1. Presenting complaint, resolved to a clinical concept where we can.
  const complaintConcept = await resolveConcept(input.complaint, DOMAIN.condition);
  if (complaintConcept) knowledgeSource = complaintConcept.source;

  written.push(
    await twin.flag(CARE_SYSTEMS.complaint, {
      eventType: CARE_EVENT_TYPES.complaint,
      occurredAt,
      title: "Presenting complaint",
      description: input.complaint,
      data: {
        ...base,
        code: "COMPLAINT",
        value: input.complaint,
        conceptId: complaintConcept?.conceptId ?? null,
        conceptName: complaintConcept?.conceptName ?? null,
        vocabularyId: complaintConcept?.vocabularyId ?? null,
      },
    }),
  );

  // 2. Vitals as a single event, per the scope document.
  if (hasAnyVital(input.vitals)) {
    const vitals = input.vitals as Vitals;
    written.push(
      await twin.flag(CARE_SYSTEMS.vitals, {
        eventType: CARE_EVENT_TYPES.vitals,
        occurredAt,
        title: "Vitals at intake",
        description: formatVitals(vitals),
        data: { ...base, code: "VITALS", value: formatVitals(vitals), vitals },
      }),
    );
  }

  // 3. One event per medication given, each resolved to a drug concept so the
  //    interaction check has a concept id to work with later.
  for (const med of meds) {
    const drug = await resolveConcept(med, DOMAIN.drug);
    if (drug) knowledgeSource = drug.source;

    written.push(
      await twin.flag(CARE_SYSTEMS.medication, {
        eventType: CARE_EVENT_TYPES.medication,
        occurredAt,
        title: `Medication: ${drug?.conceptName ?? med}`,
        description: med,
        data: {
          ...base,
          code: "MEDICATION",
          value: med,
          conceptId: drug?.conceptId ?? null,
          conceptName: drug?.conceptName ?? null,
          vocabularyId: drug?.vocabularyId ?? null,
        },
      }),
    );
  }

  return { visitId, events: written.map(toCareEvent), knowledgeSource };
}
