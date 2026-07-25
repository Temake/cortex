/**
 * Referral tokens — the consent artefact handed to OAUTHC.
 *
 * IMPORTANT DEVIATION FROM THE BUILD SCOPE, and why:
 * the scope document specifies `dtp.grants.create()`. That method does not
 * exist. `@ontomorph/dtp-sdk` exposes only `twins`, `keys`, `sandbox` and
 * `holon`, and the platform docs are explicit that grant creation is not an
 * app-side capability: "a grant is scoped, time-bounded, and owned by the
 * patient. your app never creates or revokes one." Grants are issued by the
 * patient's consent flow, or (for sandbox work) copied from the dashboard.
 *
 * So the referral step mints our own scoped, time-boxed token instead. It is
 * signed with HMAC-SHA256, carries the same scoping claims a real grant would
 * (twin, body systems, event types, expiry), and is the only thing that leaves
 * the server — the underlying sandbox grant token stays in the environment and
 * is never exposed to the frontend or embedded in the QR code.
 *
 * The token is stateless (everything needed is in the signed payload), so a
 * referral survives a dev-server restart mid-demo.
 */
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";

import { env } from "./env";

const PREFIX = "ctx1";

/**
 * The prefix used before the app was renamed. Tokens already handed out during
 * a demo keep working; only new tokens carry PREFIX.
 */
const LEGACY_PREFIXES = ["cbr1"];

const ALL_PREFIXES = [PREFIX, ...LEGACY_PREFIXES];

export type ReferralClaims = {
  /** Referral record id — also used as the `grantId` the frontend routes on. */
  referralId: string;
  /** The intake visit this referral was raised from. */
  visitId: string;
  /** The twin the receiving doctor is authorised to read. */
  twinId: string;
  /** Body systems the referral is scoped to; null means every system. */
  systems: string[] | null;
  /** Event types the referral is scoped to; null means every type. */
  eventTypes: string[] | null;
  /** Free-text reason shown to the receiving doctor. */
  reason: string | null;
  /** Issued-at, seconds since epoch. */
  iat: number;
  /** Expiry, seconds since epoch. */
  exp: number;
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string): string {
  return createHmac("sha256", env.referralSecret).update(payload).digest("base64url");
}

export class ReferralTokenError extends Error {
  constructor(
    message: string,
    readonly code: "INVALID_REFERRAL_TOKEN" | "REFERRAL_EXPIRED",
  ) {
    super(message);
    this.name = "ReferralTokenError";
  }
}

export function createReferralToken(
  input: Omit<ReferralClaims, "referralId" | "iat" | "exp"> & { ttlHours?: number },
): { token: string; claims: ReferralClaims } {
  const ttlHours = input.ttlHours ?? 48;
  const now = Math.floor(Date.now() / 1000);

  const claims: ReferralClaims = {
    referralId: randomUUID(),
    visitId: input.visitId,
    twinId: input.twinId,
    systems: input.systems,
    eventTypes: input.eventTypes,
    reason: input.reason,
    iat: now,
    exp: now + Math.round(ttlHours * 3600),
  };

  const payload = b64url(JSON.stringify(claims));
  return { token: `${PREFIX}.${payload}.${sign(payload)}`, claims };
}

/** True when `token` looks like one of ours rather than a raw DTP grant JWT. */
export function isReferralToken(token: string): boolean {
  return ALL_PREFIXES.some((p) => token.startsWith(`${p}.`));
}

export function verifyReferralToken(token: string): ReferralClaims {
  const parts = token.split(".");
  if (parts.length !== 3 || !ALL_PREFIXES.includes(parts[0])) {
    throw new ReferralTokenError("Referral token is malformed.", "INVALID_REFERRAL_TOKEN");
  }

  const [, payload, signature] = parts;
  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new ReferralTokenError("Referral token signature is invalid.", "INVALID_REFERRAL_TOKEN");
  }

  let claims: ReferralClaims;
  try {
    claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as ReferralClaims;
  } catch {
    throw new ReferralTokenError("Referral token payload is unreadable.", "INVALID_REFERRAL_TOKEN");
  }

  if (Math.floor(Date.now() / 1000) > claims.exp) {
    throw new ReferralTokenError(
      `This referral expired on ${new Date(claims.exp * 1000).toUTCString()}.`,
      "REFERRAL_EXPIRED",
    );
  }

  return claims;
}

export function referralLink(token: string): string {
  return `${env.appBaseUrl.replace(/\/$/, "")}/doctor?token=${encodeURIComponent(token)}`;
}
