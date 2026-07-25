/**
 * HOLON clinical-knowledge access for the backend.
 *
 * Three things about the live API were established by probing it, and all three
 * are load-bearing here:
 *
 * 1. `domain` IS LOWERCASE. `domain: "drug"` returns 70 hits for "warfarin";
 *    `domain: "Drug"` (as the SDK's own doc comment implies) returns zero. Valid
 *    values seen: drug, condition, observation, measurement, anatomy.
 *
 * 2. THE INTERACTION TABLE IS KEYED ON DRUGBANK CONCEPTS. Concept search ranks
 *    the RxNorm ingredient first and the DrugBank concept second, but
 *    `interactions/drug/<rxnorm id>` returns 0 rows while the DrugBank id
 *    returns thousands (warfarin: 1887, fluconazole: 2606). Resolving a drug for
 *    an interaction check must therefore PREFER DRUGBANK — this is the single
 *    difference between the check working and silently finding nothing.
 *
 * 3. Coverage is real but uneven. The table is DrugBank 5.1 + UMLS MED-RT, so
 *    plenty of everyday pairs are present, but not every textbook pair is.
 *
 * The offline fallback in `holon-fallback.ts` remains for when HOLON is
 * unreachable (it was returning 404 across every path earlier today). Critically,
 * fallback concept ids are NEVER sent to the live interaction endpoint — they are
 * RxNorm codes, not HOLON ids, so mixing them silently returns "no interaction".
 * `resolveConcept` reports its `source`, and `checkDrugList` refuses to go live
 * when any input came from the fallback.
 */
import type { HolonClient } from "@ontomorph/dtp-sdk";

import { getDtp } from "./dtp";
import {
  fallbackDrugName,
  findFallbackConcept,
  findFallbackInteraction,
  type FallbackConcept,
} from "./holon-fallback";

export type KnowledgeSource = "holon" | "fallback";

/**
 * The SDK does not re-export `InteractionEntry` from its package index, so we
 * derive it from the client's own return type rather than restating the shape
 * — that way it tracks any change in the SDK instead of drifting from it.
 */
type InteractionEntry = Awaited<
  ReturnType<HolonClient["interactions"]["checkList"]>
>["pairs"][number]["interactions"][number];

type SearchHits = Awaited<ReturnType<HolonClient["concepts"]["search"]>>["hits"];
type SearchHit = SearchHits[number];

/** HOLON domain filters, lowercase — see note 1 above. */
export const DOMAIN = {
  drug: "drug",
  condition: "condition",
  measurement: "measurement",
  observation: "observation",
} as const;

export type ResolvedConcept = {
  /** What we were asked to resolve, verbatim (e.g. "Ibuprofen 400mg tds"). */
  query: string;
  conceptId: number;
  conceptName: string;
  conceptCode: string;
  vocabularyId: string;
  domainId: string;
  source: KnowledgeSource;
};

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

const BREAKER_COOLDOWN_MS = 60_000;
let holonDownUntil = 0;
let lastHolonError: string | null = null;

function liveDisabled(): boolean {
  return Date.now() < holonDownUntil;
}

function noteFailure(error: unknown) {
  holonDownUntil = Date.now() + BREAKER_COOLDOWN_MS;
  lastHolonError = (error as Error)?.message ?? String(error);
  console.warn("[carebridge] HOLON unavailable, using offline fallback:", lastHolonError);
}

function noteSuccess() {
  holonDownUntil = 0;
  lastHolonError = null;
}

/** Reported by routes so the UI can show a "live / offline knowledge" badge. */
export function holonStatus() {
  return {
    live: !liveDisabled(),
    lastError: lastHolonError,
    retryAt: holonDownUntil ? new Date(holonDownUntil).toISOString() : null,
  };
}

function fromFallback(query: string, concept: FallbackConcept): ResolvedConcept {
  return {
    query,
    conceptId: concept.conceptId,
    conceptName: concept.conceptName,
    conceptCode: concept.conceptCode,
    vocabularyId: concept.vocabularyId,
    domainId: concept.domainId,
    source: "fallback",
  };
}

/** Strip dose/route noise so "Ibuprofen 400mg tds" still resolves. */
function searchTerm(input: string): string {
  return (
    input
      .replace(/\b\d+(\.\d+)?\s*(mg|mcg|g|ml|iu|units?)\b/gi, " ")
      .replace(/\b(od|bd|tds|qds|prn|nocte|daily|twice|thrice|oral|iv|im|po)\b/gi, " ")
      .replace(/[^\p{L}\p{N}\s-]/gu, " ")
      .replace(/\s+/g, " ")
      .trim() || input.trim()
  );
}

/**
 * Choose the most useful hit for our purposes.
 *
 * For drugs that means the DrugBank ingredient concept (see note 2) — without
 * this the interaction check resolves to an RxNorm id that has zero interaction
 * rows. Otherwise prefer an exact name match, then whatever ranked first.
 */
function pickHit(hits: SearchHits, term: string, domain?: string): SearchHit | undefined {
  if (!hits?.length) return undefined;
  const lower = term.toLowerCase();
  const exact = (hit: SearchHit) => hit.conceptName.toLowerCase() === lower;

  if (domain === DOMAIN.drug) {
    const drugBank = hits.filter((h) => h.vocabularyId === "DrugBank");
    return drugBank.find(exact) ?? drugBank[0] ?? hits.find(exact) ?? hits[0];
  }

  return hits.find(exact) ?? hits[0];
}

/**
 * Resolve free text to a single clinical concept.
 *
 * Returns null when neither HOLON nor the fallback recognises the text, which
 * callers surface as a clean "couldn't resolve" rather than an error.
 */
export async function resolveConcept(
  query: string,
  domain?: string,
): Promise<ResolvedConcept | null> {
  const text = query.trim();
  if (!text) return null;
  const term = searchTerm(text);

  if (!liveDisabled()) {
    try {
      const response = await getDtp().holon.concepts.search(term, {
        ...(domain ? { domain } : {}),
        pageSize: 25,
      });
      noteSuccess();

      const hit = pickHit(response.hits, term, domain);
      if (hit) {
        return {
          query: text,
          conceptId: hit.conceptId,
          conceptName: hit.conceptName,
          conceptCode: hit.conceptCode,
          vocabularyId: hit.vocabularyId,
          domainId: hit.domainId,
          source: "holon",
        };
      }
      // HOLON answered but knows nothing — try the local table before giving up.
    } catch (error) {
      noteFailure(error);
    }
  }

  const local = findFallbackConcept(text, domain);
  return local ? fromFallback(text, local) : null;
}

function toPair(entry: InteractionEntry): InteractionPair {
  return {
    drugA: entry.drugAConceptId,
    drugB: entry.drugBConceptId,
    drugAName: entry.drugAName,
    drugBName: entry.drugBName,
    severity: entry.severity,
    mechanism: entry.mechanism,
    clinicalEffect: entry.clinicalEffect,
    management: entry.management,
    evidenceGrade: entry.evidenceGrade,
    source: entry.source,
  };
}

/** Rank so the most clinically urgent interaction is always presented first. */
const SEVERITY_RANK: Record<string, number> = {
  contraindicated: 4,
  major: 3,
  moderate: 2,
  minor: 1,
};

export function sortBySeverity(interactions: InteractionPair[]): InteractionPair[] {
  return [...interactions].sort(
    (a, b) =>
      (SEVERITY_RANK[b.severity?.toLowerCase()] ?? 0) -
      (SEVERITY_RANK[a.severity?.toLowerCase()] ?? 0),
  );
}

/** Evaluate every unordered pair against the offline table. */
function offlineCheck(ids: number[]): InteractionPair[] {
  const found: InteractionPair[] = [];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const hit = findFallbackInteraction(ids[i], ids[j]);
      if (hit) {
        found.push({
          drugA: hit.drugA,
          drugB: hit.drugB,
          drugAName: fallbackDrugName(hit.drugA),
          drugBName: fallbackDrugName(hit.drugB),
          severity: hit.severity,
          mechanism: hit.mechanism,
          clinicalEffect: hit.clinicalEffect,
          management: hit.management,
          evidenceGrade: "established",
          source: "CareBridge offline reference",
        });
      }
    }
  }
  return found;
}

export type DrugListResult = {
  interactions: InteractionPair[];
  totalDrugs: number;
  source: KnowledgeSource | "mixed";
  /** Drugs whose ids came from the offline table and so could not join the live check. */
  offlineOnlyCount: number;
};

/**
 * Check a whole medication list for pairwise interactions.
 *
 * The two id spaces MUST be kept apart. HOLON ids and offline-table RxNorm codes
 * are not comparable, and mixing them into one live call returns a confident,
 * wrong "no interaction". So the caller partitions them and we check each space
 * with the source that understands it, then merge.
 *
 * This partitioning matters in practice, not just in theory: a single
 * unrecognised medication on the twin (a typo like "paracetamo") used to fall
 * back and drag the whole check offline, which silently hid a genuine MAJOR
 * interaction between two properly-resolved drugs.
 */
export async function checkDrugList(input: {
  holonIds: number[];
  fallbackIds?: number[];
}): Promise<DrugListResult> {
  const holonIds = [...new Set(input.holonIds.filter((id) => Number.isFinite(id)))];
  const fallbackIds = [...new Set((input.fallbackIds ?? []).filter((id) => Number.isFinite(id)))];
  const totalDrugs = holonIds.length + fallbackIds.length;

  const collected: InteractionPair[] = [];
  let usedLive = false;
  let usedOffline = false;

  // Live check across everything HOLON itself resolved.
  if (holonIds.length >= 2 && !liveDisabled()) {
    try {
      const result = await getDtp().holon.interactions.checkList(holonIds);
      noteSuccess();
      collected.push(...(result.pairs ?? []).flatMap((p) => p.interactions ?? []).map(toPair));
      usedLive = true;
    } catch (error) {
      noteFailure(error);
      // HOLON just died mid-request; the offline table is keyed differently and
      // cannot stand in for these ids, so there is nothing to salvage here.
    }
  }

  // Offline check across the ids only the offline table understands.
  if (fallbackIds.length >= 2) {
    collected.push(...offlineCheck(fallbackIds));
    usedOffline = true;
  }

  return {
    interactions: sortBySeverity(collected),
    totalDrugs,
    source: usedLive && usedOffline ? "mixed" : usedLive ? "holon" : "fallback",
    offlineOnlyCount: fallbackIds.length,
  };
}
