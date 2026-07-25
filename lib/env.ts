/**
 * Server-side environment access.
 *
 * Nothing in here is ever imported from a client component — every value is a
 * secret or a server-only base URL. Reading happens lazily so that a missing
 * variable surfaces as a clean 500 from the route that needed it, rather than
 * crashing the whole dev server at import time.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable ${name}. Add it to .env.local — see .env.example.`,
    );
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

export const env = {
  get dtpKey() {
    return required("DTP_KEY");
  },
  get holonKey() {
    return required("HOLON_KEY");
  },
  /**
   * The one sandbox twin's grant token, copied from the dashboard's Sandbox page.
   * Every route in this prototype operates on this single twin — see README.
   */
  get sandboxGrantToken() {
    return required("SANDBOX_GRANT_TOKEN");
  },
  get dtpBaseUrl() {
    return optional("DTP_BASE_URL", "https://sandbox-api.ontomorph.com");
  },
  get holonApiUrl() {
    return optional("HOLON_API_URL", "https://holon-api.ontomorph.com");
  },
  /** HMAC secret used to sign the referral tokens issued by /api/refer. */
  get referralSecret() {
    return optional("REFERRAL_SECRET", "cortex-oau-dev-secret-change-me");
  },
  /** Base URL used to build the shareable referral link returned by /api/refer. */
  get appBaseUrl() {
    return optional("APP_BASE_URL", "http://localhost:3000");
  },
};
