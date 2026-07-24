/**
 * POST /api/refer — the nurse raises a referral to OAUTHC.
 *
 * Body:   { visitId, reason?, ttlHours?, systems? }
 * Returns { ok, referralId, grantToken, link, expiresAt, scope, visit }
 *
 * `grantToken` is a CareBridge referral token, not a raw DTP grant. See the
 * header comment in lib/referral.ts for why: the platform does not let an app
 * create grants, so we mint a scoped, time-boxed, signed token of our own and
 * keep the sandbox grant token server-side. /api/doctor/history accepts either.
 *
 * The field is still named `grantToken` because that is what the build scope
 * and the frontend expect to receive and pass back.
 */
import { fail, handleError, ok, readJson } from "@/lib/api";
import { connectSandboxTwin } from "@/lib/dtp";
import { createReferralToken, referralLink } from "@/lib/referral";
import { ALL_CARE_EVENT_TYPES, ALL_CARE_SYSTEMS, groupVisits, readCareEvents } from "@/lib/visits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ReferBody = {
  visitId?: string;
  reason?: string;
  ttlHours?: number;
  systems?: string[];
};

export async function POST(request: Request) {
  const parsed = await readJson<ReferBody>(request);
  if ("error" in parsed) return parsed.error;

  const { visitId, reason, ttlHours, systems } = parsed.body;

  if (typeof visitId !== "string" || !visitId.trim()) {
    return fail("MISSING_VISIT_ID", "A visitId is required to raise a referral.", 400);
  }

  // Clamp the time-box to something demo-sane; the scope asks for 24-48h.
  const ttl = Number.isFinite(ttlHours) ? Math.min(Math.max(Number(ttlHours), 1), 168) : 48;

  try {
    const twin = connectSandboxTwin();

    // Confirm the visit exists, and scope the referral to the systems it
    // actually touched rather than handing over the whole twin by default.
    const events = await readCareEvents(twin);
    const visit = groupVisits(events).find((v) => v.visitId === visitId);

    if (!visit) {
      return fail(
        "VISIT_NOT_FOUND",
        `No visit found with id ${visitId}. Log an intake first.`,
        404,
      );
    }

    const visitSystems = [...new Set(visit.events.map((e) => e.system))];
    const scopedSystems =
      Array.isArray(systems) && systems.length
        ? systems
        : [...new Set([...visitSystems, ...ALL_CARE_SYSTEMS])];

    const { token, claims } = createReferralToken({
      visitId,
      twinId: twin.id,
      systems: scopedSystems,
      eventTypes: ALL_CARE_EVENT_TYPES,
      reason: reason?.trim() || null,
      ttlHours: ttl,
    });

    return ok({
      referralId: claims.referralId,
      // Named `grantToken` for the frontend's benefit — see file header.
      grantToken: token,
      link: referralLink(token),
      issuedAt: new Date(claims.iat * 1000).toISOString(),
      expiresAt: new Date(claims.exp * 1000).toISOString(),
      expiresInHours: ttl,
      scope: {
        twinId: claims.twinId,
        systems: claims.systems,
        eventTypes: claims.eventTypes,
      },
      visit: {
        visitId: visit.visitId,
        occurredAt: visit.occurredAt,
        eventCount: visit.events.length,
      },
    });
  } catch (error) {
    return handleError(error);
  }
}
