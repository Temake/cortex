/**
 * The API contract, as the frontend sees it.
 *
 * Pure types only — no imports, no runtime code — so client components can use
 * these without pulling the SDK or any server module into the browser bundle.
 * These mirror the route handlers in app/api/**; keep them in step.
 */

export type ApiFailure = { ok: false; error: { code: string; message: string } };
export type ApiResult<T> = ({ ok: true } & T) | ApiFailure;

export type KnowledgeSource = "holon" | "fallback";

export type HolonStatus = {
  live: boolean;
  lastError: string | null;
  retryAt: string | null;
};

export type Vitals = {
  temp?: string | number | null;
  bp?: string | null;
  hr?: string | number | null;
  rr?: string | number | null;
  spo2?: string | number | null;
};

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
  vitals: Vitals | null;
  fromCareBridge: boolean;
};

export type MedicationRecord = {
  eventId: string;
  name: string;
  conceptId: number | null;
  conceptName: string | null;
  occurredAt: string;
};

export type Visit = { visitId: string; events: CareEvent[]; occurredAt: string };

/* ── POST /api/intake ─────────────────────────────────────────────── */
export type IntakeResponse = {
  visitId: string;
  twinId: string;
  events: CareEvent[];
  eventCount: number;
  knowledgeSource: KnowledgeSource | null;
  holon: HolonStatus;
};

/* ── POST /api/refer ──────────────────────────────────────────────── */
export type ReferResponse = {
  referralId: string;
  /** A CareBridge referral token — see lib/referral.ts on the naming. */
  grantToken: string;
  link: string;
  issuedAt: string;
  expiresAt: string;
  expiresInHours: number;
  scope: { twinId: string; systems: string[] | null; eventTypes: string[] | null };
  visit: { visitId: string; occurredAt: string; eventCount: number };
};

/* ── POST /api/doctor/history ─────────────────────────────────────── */
export type HistoryResponse = {
  twinId: string;
  tokenKind: "referral" | "grant";
  scope: { systems: string[] | null; eventTypes: string[] | null; expiresAt: string | null };
  referral: {
    referralId: string;
    visitId: string;
    reason: string | null;
    issuedAt: string;
    expiresAt: string;
  } | null;
  events: CareEvent[];
  eventCount: number;
  systems: Array<{ system: string; eventCount: number }>;
  medications: MedicationRecord[];
  visits: Visit[];
};

/* ── POST /api/interactions/check ─────────────────────────────────── */
export type InteractionPair = {
  drugA: number;
  drugB: number;
  drugAName: string;
  drugBName: string;
  severity: string;
  mechanism: string | null;
  clinicalEffect: string;
  management: string;
  evidenceGrade: string;
  source: string;
};

export type InteractionCheckResponse = {
  hasInteraction: boolean;
  resolvedNewDrug: boolean;
  severity: string | null;
  description: string;
  interaction: InteractionPair | null;
  interactions: InteractionPair[];
  otherInteractions: InteractionPair[];
  newDrug: { query: string; conceptId: number | null; conceptName: string | null; vocabularyId?: string | null };
  existingMeds: MedicationRecord[];
  checkedConceptIds?: number[];
  twinId?: string;
  knowledgeSource: KnowledgeSource;
  holon: HolonStatus;
};

/* ── POST /api/summary ────────────────────────────────────────────── */
export type SummaryItem = {
  label: string;
  value: string;
  conceptName: string | null;
  vocabularyId: string | null;
  code: string;
};

export type SummaryResponse = {
  twinId: string;
  visitId: string | null;
  occurredAt: string | null;
  hostel?: string | null;
  summary: string;
  lines: string[];
  items: SummaryItem[];
  eventCount?: number;
  knowledgeSource: KnowledgeSource | null;
  holon: HolonStatus;
};

/* ── GET /api/clusters/mock ───────────────────────────────────────── */
export type ClusterRecord = { condition: string; hostel: string; date: string };

export type ClustersResponse = {
  mocked: true;
  note: string;
  total: number;
  records: ClusterRecord[];
  matrix: Array<Record<string, string | number>>;
  conditions: string[];
  hostels: string[];
  spike: { condition: string; hostel: string; count: number };
  dateRange: { from: string | null; to: string | null };
};

/* ── Shared client helper ─────────────────────────────────────────── */

/**
 * POST JSON and normalise both transport and application failures into one
 * thrown `ApiClientError`, so pages only need a single catch.
 */
export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export async function postJson<T>(path: string, body: unknown): Promise<T> {
  let payload: ApiResult<T>;
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    payload = (await res.json()) as ApiResult<T>;
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : "Could not reach the server.",
      "NETWORK_ERROR",
    );
  }

  if (!payload.ok) {
    throw new ApiClientError(payload.error.message, payload.error.code);
  }
  return payload as T;
}

export async function getJson<T>(path: string): Promise<T> {
  let payload: ApiResult<T>;
  try {
    const res = await fetch(path);
    payload = (await res.json()) as ApiResult<T>;
  } catch (error) {
    throw new ApiClientError(
      error instanceof Error ? error.message : "Could not reach the server.",
      "NETWORK_ERROR",
    );
  }

  if (!payload.ok) {
    throw new ApiClientError(payload.error.message, payload.error.code);
  }
  return payload as T;
}

/* ── Display helpers ──────────────────────────────────────────────── */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "3 days ago" / "in 2 days" — used for referral expiry and event recency. */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const diffSeconds = Math.round((then - Date.now()) / 1000);
  const absolute = Math.abs(diffSeconds);

  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["day", 86_400],
    ["hour", 3_600],
    ["minute", 60],
  ];

  const formatter = new Intl.RelativeTimeFormat("en-GB", { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (absolute >= seconds) {
      return formatter.format(Math.round(diffSeconds / seconds), unit);
    }
  }
  return "just now";
}

export type Severity = "major" | "moderate" | "minor" | "contraindicated" | "unknown";

export function normaliseSeverity(value: string | null | undefined): Severity {
  const s = value?.toLowerCase();
  if (s === "major" || s === "moderate" || s === "minor" || s === "contraindicated") return s;
  return "unknown";
}
