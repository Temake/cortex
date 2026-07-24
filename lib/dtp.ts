/**
 * The single Ontomorph DTP client for the whole backend.
 *
 * Every Ontomorph/HOLON call in this app goes through here, so the API keys
 * never leave the server. The client is memoised per-process because building
 * it is cheap but pointless to repeat on every request.
 */
import { DTP, type HealthEvent, type Twin } from "@ontomorph/dtp-sdk";

import { env } from "./env";

let client: DTP | null = null;

export function getDtp(): DTP {
  if (!client) {
    client = new DTP({
      apiKey: env.dtpKey,
      baseUrl: env.dtpBaseUrl,
      holonApiUrl: env.holonApiUrl,
      holonApiKey: env.holonKey,
    });
  }
  return client;
}

/**
 * Connect to a twin by grant token. `connect` is local-only (it just decodes
 * the JWT to read `twin_id`), so this never hits the network on its own.
 */
export function connectTwin(grantToken: string): Twin {
  return getDtp().twins.connect(grantToken);
}

/** Connect to the one sandbox twin this prototype is built around. */
export function connectSandboxTwin(): Twin {
  return connectTwin(env.sandboxGrantToken);
}

export type { HealthEvent, Twin };
