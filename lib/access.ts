/**
 * Turning a token the doctor pasted into an authorised, scoped twin session.
 *
 * Two kinds of token arrive here:
 *   - a Cortex referral token (`ctx1.…`) issued by /api/refer, which we
 *     verify and whose scope we enforce ourselves; the underlying sandbox
 *     grant token never leaves the server;
 *   - a raw DTP grant JWT (`eyJ…`) pasted straight from the dashboard, which
 *     we hand to `dtp.twins.connect()` and let the platform scope.
 *
 * Both end up as the same `TwinSession`, so the routes downstream do not care
 * which one the demo used.
 */
import type { Twin } from "@ontomorph/dtp-sdk";

import { connectSandboxTwin, connectTwin } from "./dtp";
import { isReferralToken, verifyReferralToken, type ReferralClaims } from "./referral";
import { type CareEvent } from "./visits";

export type TwinSession = {
  twin: Twin;
  twinId: string;
  /** Present only when the caller used a Cortex referral token. */
  referral: ReferralClaims | null;
  scope: {
    systems: string[] | null;
    eventTypes: string[] | null;
    expiresAt: string | null;
  };
  tokenKind: "referral" | "grant";
};

export class AccessError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 403,
  ) {
    super(message);
    this.name = "AccessError";
  }
}

/**
 * Resolve a pasted token to a connected twin. Accepts a full referral link as
 * well as a bare token, because during the demo the doctor pastes whichever
 * the QR code gave them.
 */
export function openTwinSession(rawToken: string): TwinSession {
  const token = extractToken(rawToken);

  if (!token) {
    throw new AccessError("No referral token was provided.", "MISSING_TOKEN", 400);
  }

  if (isReferralToken(token)) {
    // Throws ReferralTokenError (INVALID_REFERRAL_TOKEN / REFERRAL_EXPIRED).
    const claims = verifyReferralToken(token);
    const twin = connectSandboxTwin();

    if (twin.id !== claims.twinId) {
      throw new AccessError(
        "This referral was issued for a different twin than the one configured.",
        "TWIN_MISMATCH",
        403,
      );
    }

    return {
      twin,
      twinId: twin.id,
      referral: claims,
      scope: {
        systems: claims.systems,
        eventTypes: claims.eventTypes,
        expiresAt: new Date(claims.exp * 1000).toISOString(),
      },
      tokenKind: "referral",
    };
  }

  // Raw DTP grant JWT — the platform enforces its own scope server-side.
  let twin: Twin;
  try {
    twin = connectTwin(token);
  } catch {
    throw new AccessError(
      "That token is neither a Cortex referral nor a valid DTP grant token.",
      "INVALID_TOKEN",
      400,
    );
  }

  return {
    twin,
    twinId: twin.id,
    referral: null,
    scope: {
      systems: twin.grant.systems,
      eventTypes: twin.grant.eventTypes,
      expiresAt: null,
    },
    tokenKind: "grant",
  };
}

/** Pull the token out of a bare string, a full referral link, or a query string. */
export function extractToken(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes("token=")) {
    try {
      const url = trimmed.startsWith("http") ? new URL(trimmed) : new URL(trimmed, "http://x");
      const fromQuery = url.searchParams.get("token");
      if (fromQuery) return fromQuery.trim();
    } catch {
      // Not a URL after all; fall through and use it verbatim.
    }
  }

  return trimmed;
}

/**
 * Apply a referral's scope to a list of events.
 *
 * A raw grant is already scoped by the platform, so this is a no-op for that
 * path. For our own referral tokens we enforce the scope here, since we are
 * the ones who issued it.
 */
export function applyScope(events: CareEvent[], session: TwinSession): CareEvent[] {
  const { systems, eventTypes } = session.scope;
  if (session.tokenKind !== "referral") return events;

  return events.filter((event) => {
    if (systems && systems.length && !systems.includes(event.system)) return false;
    if (eventTypes && eventTypes.length && !eventTypes.includes(event.eventType)) return false;
    return true;
  });
}
