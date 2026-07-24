/**
 * POST /api/interactions/check — check a new prescription against the twin.
 *
 * Body:   { grantToken, newDrug }
 * Returns { ok, hasInteraction, severity, description, interaction,
 *           interactions, otherInteractions, newDrug, existingMeds, ... }
 *
 * Flow, per the build scope: resolve the new drug through HOLON concepts,
 * pull the twin's existing medications, then run the whole list through
 * `holon.interactions.checkList()`.
 *
 * `severity` / `description` / `interaction` describe the single most urgent
 * finding involving the NEW drug — that is what the InteractionAlert banner
 * renders. `interactions` is every finding involving the new drug;
 * `otherInteractions` is anything already present between existing meds, so
 * the doctor sees it without it being blamed on the new prescription.
 */
import { AccessError, applyScope, openTwinSession } from "@/lib/access";
import { fail, handleError, ok, readJson } from "@/lib/api";
import {
  checkDrugList,
  holonStatus,
  resolveConcept,
  sortBySeverity,
  type InteractionPair,
} from "@/lib/holon";
import { ReferralTokenError } from "@/lib/referral";
import { extractMedications, readCareEvents } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckBody = { grantToken?: string; token?: string; newDrug?: string };

/** One readable sentence for the alert banner. */
function describe(hit: InteractionPair | null, newDrugName: string, medCount: number): string {
  if (!hit) {
    return medCount === 0
      ? `No existing medications are recorded on this twin, so there is nothing to check ${newDrugName} against.`
      : `No known interaction between ${newDrugName} and the patient's ${medCount} recorded medication${medCount === 1 ? "" : "s"}.`;
  }

  const severity = hit.severity ? hit.severity.toLowerCase() : "unclassified";
  return `${hit.drugAName} + ${hit.drugBName} — ${severity} interaction. ${hit.clinicalEffect} ${hit.management}`.trim();
}

export async function POST(request: Request) {
  const parsed = await readJson<CheckBody>(request);
  if ("error" in parsed) return parsed.error;

  const raw = parsed.body.grantToken ?? parsed.body.token;
  const newDrug = parsed.body.newDrug;

  if (typeof newDrug !== "string" || !newDrug.trim()) {
    return fail("MISSING_DRUG", "A newDrug name is required.", 400);
  }

  try {
    const session = openTwinSession(raw ?? "");
    const scoped = applyScope(await readCareEvents(session.twin), session);
    const meds = extractMedications(scoped);

    // 1. Resolve the drug the doctor is about to prescribe.
    const resolved = await resolveConcept(newDrug.trim(), "Drug");
    if (!resolved) {
      return ok({
        hasInteraction: false,
        resolvedNewDrug: false,
        severity: null,
        description: `"${newDrug.trim()}" could not be resolved to a known drug concept, so no interaction check was possible. Check the spelling, or enter the generic name.`,
        interaction: null,
        interactions: [],
        otherInteractions: [],
        newDrug: { query: newDrug.trim(), conceptId: null, conceptName: null },
        existingMeds: meds,
        knowledgeSource: holonStatus().live ? "holon" : "fallback",
        holon: holonStatus(),
      });
    }

    // 2. Resolve any existing medication that was recorded without a concept id
    //    (pre-existing twin events, or intake written while HOLON was down).
    const existing = await Promise.all(
      meds.map(async (med) => {
        if (med.conceptId) return med;
        const hit = await resolveConcept(med.name, "Drug");
        return { ...med, conceptId: hit?.conceptId ?? null, conceptName: hit?.conceptName ?? null };
      }),
    );

    const existingIds = existing.map((m) => m.conceptId).filter((id): id is number => id != null);

    // 3. Check the whole medication list at once.
    const { interactions, source } = await checkDrugList([...existingIds, resolved.conceptId]);

    const involvesNew = (i: InteractionPair) =>
      i.drugA === resolved.conceptId || i.drugB === resolved.conceptId;

    const withNewDrug = sortBySeverity(interactions.filter(involvesNew));
    const otherInteractions = sortBySeverity(interactions.filter((i) => !involvesNew(i)));
    const primary = withNewDrug[0] ?? null;

    return ok({
      hasInteraction: withNewDrug.length > 0,
      resolvedNewDrug: true,
      severity: primary?.severity ?? null,
      description: describe(primary, resolved.conceptName, existing.length),
      interaction: primary,
      interactions: withNewDrug,
      otherInteractions,
      newDrug: {
        query: resolved.query,
        conceptId: resolved.conceptId,
        conceptName: resolved.conceptName,
        vocabularyId: resolved.vocabularyId,
      },
      existingMeds: existing,
      checkedConceptIds: [...existingIds, resolved.conceptId],
      twinId: session.twinId,
      knowledgeSource: source,
      holon: holonStatus(),
    });
  } catch (error) {
    if (error instanceof ReferralTokenError) return fail(error.code, error.message, 403);
    if (error instanceof AccessError) return fail(error.code, error.message, error.status);
    return handleError(error);
  }
}
