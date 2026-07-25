/**
 * POST /api/interactions/check — check a drug against the twin's medications.
 *
 * Serves two callers:
 *   - the doctor, who passes a referral `grantToken` and gets a scoped read;
 *   - the student, who passes no token and reads their own twin (they own it, so
 *     no grant is involved).
 *
 * Body:   { grantToken?, newDrug }
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
import { connectSandboxTwin } from "@/lib/dtp";
import {
  checkDrugList,
  DOMAIN,
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
    // A token scopes the read to what a referral authorised — that is the
    // doctor's path. WITHOUT one we fall back to the single sandbox twin, which
    // is the student checking their own record: they own the twin, so no grant
    // is involved. /api/summary already works this way; this mirrors it.
    let meds: ReturnType<typeof extractMedications>;
    let twinId: string;

    if (raw && raw.trim()) {
      const session = openTwinSession(raw);
      meds = extractMedications(applyScope(await readCareEvents(session.twin), session));
      twinId = session.twinId;
    } else {
      const twin = connectSandboxTwin();
      meds = extractMedications(await readCareEvents(twin));
      twinId = twin.id;
    }

    // 1. Resolve the drug the doctor is about to prescribe.
    const resolved = await resolveConcept(newDrug.trim(), DOMAIN.drug);
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

    // 2. Re-resolve every existing medication by name rather than trusting the
    //    stored conceptId.
    //
    //    Stored ids cannot be trusted for an interaction check: events written
    //    while HOLON was unreachable carry offline-table RxNorm codes, and even
    //    a live-resolved id may be the RxNorm concept, which has no interaction
    //    rows. Re-resolving routes every drug through the DrugBank-preferring
    //    picker, which is what the interaction table is keyed on.
    const existing = await Promise.all(
      meds.map(async (med) => {
        const hit = await resolveConcept(med.name, DOMAIN.drug);
        return {
          ...med,
          conceptId: hit?.conceptId ?? med.conceptId,
          conceptName: hit?.conceptName ?? med.conceptName,
          resolvedFrom: hit?.source ?? null,
        };
      }),
    );

    // 3. Partition by id space before checking — HOLON ids and offline-table
    //    RxNorm codes are not comparable. See the note on checkDrugList.
    const holonIds: number[] = [];
    const fallbackIds: number[] = [];

    for (const med of existing) {
      if (med.conceptId == null) continue;
      (med.resolvedFrom === "fallback" ? fallbackIds : holonIds).push(med.conceptId);
    }
    (resolved.source === "fallback" ? fallbackIds : holonIds).push(resolved.conceptId);

    const { interactions, source, offlineOnlyCount } = await checkDrugList({
      holonIds,
      fallbackIds,
    });

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
      checkedConceptIds: [...holonIds, ...fallbackIds],
      /** Medications HOLON could not resolve, so they sat out the live check. */
      offlineOnlyCount,
      twinId,
      knowledgeSource: source,
      holon: holonStatus(),
    });
  } catch (error) {
    if (error instanceof ReferralTokenError) return fail(error.code, error.message, 403);
    if (error instanceof AccessError) return fail(error.code, error.message, error.status);
    return handleError(error);
  }
}
