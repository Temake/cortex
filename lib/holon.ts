/**
 * HOLON clinical-knowledge access for the backend.
 *
 * Every call tries the real HOLON API first and degrades to the offline table
 * in `holon-fallback.ts` only when the live call throws. The path taken is
 * always reported back as `source`, so a route response never implies live
 * clinical data when it came from the fallback.
 *
 * A tiny circuit breaker stops us paying a full network timeout on every
 * request while HOLON is down: after a failure we skip the live call for
 * `BREAKER_COOLDOWN_MS`, then let one request through to re-test it.
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

/**
 * Resolve free text to a single clinical concept.
 *
 * `domain` is HOLON's OMOP-style domain filter — "Drug", "Condition",
 * "Measurement". Returns null when neither HOLON nor the fallback recognises
 * the text, which callers surface as a clean "couldn't resolve" rather than an
 * error.
 */
export async function resolveConcept(
  query: string,
  domain?: string,
): Promise<ResolvedConcept | null> {
  const text = query.trim();
  if (!text) return null;

  if (!liveDisabled()) {
    try {
      const response = await getDtp().holon.concepts.search(text, {
        ...(domain ? { domain } : {}),
        pageSize: 5,
      });
      noteSuccess();
      const hit = response.hits?.[0];
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

/**
 * Check a whole medication list for pairwise interactions.
 *
 * Mirrors `holon.interactions.checkList`, flattened into one sorted array
 * because that is what the alert banner actually renders.
 */
export async function checkDrugList(
  conceptIds: number[],
): Promise<{ interactions: InteractionPair[]; totalDrugs: number; source: KnowledgeSource }> {
  const unique = [...new Set(conceptIds.filter((id) => Number.isFinite(id)))];
  if (unique.length < 2) {
    return { interactions: [], totalDrugs: unique.length, source: liveDisabled() ? "fallback" : "holon" };
  }

  if (!liveDisabled()) {
    try {
      const result = await getDtp().holon.interactions.checkList(unique);
      noteSuccess();
      const flattened = (result.pairs ?? []).flatMap((p) => p.interactions ?? []).map(toPair);
      return {
        interactions: sortBySeverity(flattened),
        totalDrugs: result.totalDrugs ?? unique.length,
        source: "holon",
      };
    } catch (error) {
      noteFailure(error);
    }
  }

  // Offline: evaluate every unordered pair against the local table.
  const found: InteractionPair[] = [];
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      const hit = findFallbackInteraction(unique[i], unique[j]);
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

  return { interactions: sortBySeverity(found), totalDrugs: unique.length, source: "fallback" };
}
