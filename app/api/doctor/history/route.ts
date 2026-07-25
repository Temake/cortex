/**
 * POST /api/doctor/history — the receiving doctor opens a referral.
 *
 * Body:   { grantToken }   (a Cortex referral token, a raw DTP grant JWT,
 *                           or the full referral link — all accepted)
 * Returns { ok, twinId, scope, referral, events: [...], systems: [...],
 *           medications: [...], visits: [...] }
 *
 * `events` is the flat, scoped history the TwinHistoryView renders. `systems`
 * and `visits` are pre-grouped so the frontend does not have to reduce.
 */
import { AccessError, applyScope, openTwinSession } from "@/lib/access";
import { fail, handleError, ok, readJson } from "@/lib/api";
import { ReferralTokenError } from "@/lib/referral";
import { extractMedications, groupVisits, readCareEvents } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type HistoryBody = { grantToken?: string; token?: string };

export async function POST(request: Request) {
  const parsed = await readJson<HistoryBody>(request);
  if ("error" in parsed) return parsed.error;

  const raw = parsed.body.grantToken ?? parsed.body.token;

  try {
    const session = openTwinSession(raw ?? "");
    const scoped = applyScope(await readCareEvents(session.twin), session);

    const systems = [...new Set(scoped.map((e) => e.system))].map((system) => ({
      system,
      eventCount: scoped.filter((e) => e.system === system).length,
    }));

    return ok({
      twinId: session.twinId,
      tokenKind: session.tokenKind,
      scope: session.scope,
      referral: session.referral
        ? {
            referralId: session.referral.referralId,
            visitId: session.referral.visitId,
            reason: session.referral.reason,
            issuedAt: new Date(session.referral.iat * 1000).toISOString(),
            expiresAt: new Date(session.referral.exp * 1000).toISOString(),
          }
        : null,
      events: scoped,
      eventCount: scoped.length,
      systems,
      medications: extractMedications(scoped),
      visits: groupVisits(scoped),
    });
  } catch (error) {
    if (error instanceof ReferralTokenError) return fail(error.code, error.message, 403);
    if (error instanceof AccessError) return fail(error.code, error.message, error.status);
    return handleError(error);
  }
}
