/**
 * Offline intake queue.
 *
 * The Health Centre's network is unreliable, and an intake that fails to upload
 * is a visit that never happened. So a submission is never lost: if the POST
 * cannot reach the server, the payload is written to IndexedDB and replayed
 * later.
 *
 * WHY IndexedDB AND NOT localStorage: localStorage is synchronous, string-only,
 * and capped around 5MB shared with everything else on the origin. A queue of
 * clinical records wants a real transactional store.
 *
 * WHY THE CLIENT DRAINS THE QUEUE, NOT THE SERVICE WORKER: the Background Sync
 * API can wake a worker to replay requests, but the caller needs the `visitId`
 * that comes back in order to route to the referral step, and a worker cannot
 * hand that to a page that may no longer exist. Draining here keeps the result
 * where it is needed and works in browsers without Background Sync. The service
 * worker deliberately ignores non-GET requests so it can never replay a POST
 * behind our back and double-write events onto the twin.
 *
 * Replay is at-least-once, not exactly-once. Each entry carries a `clientId`
 * that is sent as `Idempotency-Key`, so the server has what it needs to
 * de-duplicate if that is added later. Today a replayed entry that actually
 * succeeded the first time would write twice — see the note on `drainQueue`.
 */

export type QueuedIntake = {
  /** Stable id for this submission, also sent as the idempotency key. */
  clientId: string;
  /** The exact body that would have been POSTed to /api/intake. */
  payload: unknown;
  /** When the nurse pressed submit, ISO-8601. */
  queuedAt: string;
  /** How many replay attempts have been made. */
  attempts: number;
  /** The last failure, for the UI to show when something is stuck. */
  lastError: string | null;
};

const DB_NAME = "cortex-offline";
const DB_VERSION = 1;
const STORE = "intake-queue";

/** Fired whenever the queue changes, so UI can re-read the count. */
export const QUEUE_EVENT = "cortex:queue-changed";

function notifyChanged() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUEUE_EVENT));
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is unavailable in this browser."));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "clientId" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open IndexedDB."));
  });
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const request = run(transaction.objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
        transaction.oncomplete = () => db.close();
      }),
  );
}

export async function enqueueIntake(payload: unknown): Promise<QueuedIntake> {
  const entry: QueuedIntake = {
    clientId: crypto.randomUUID(),
    payload,
    queuedAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  };

  await tx("readwrite", (store) => store.add(entry));
  notifyChanged();
  return entry;
}

export async function listQueue(): Promise<QueuedIntake[]> {
  try {
    const all = await tx<QueuedIntake[]>("readonly", (store) => store.getAll() as IDBRequest<QueuedIntake[]>);
    return all.sort((a, b) => a.queuedAt.localeCompare(b.queuedAt));
  } catch {
    // A private-mode browser with IndexedDB blocked should not break the page.
    return [];
  }
}

export async function queueCount(): Promise<number> {
  try {
    return await tx<number>("readonly", (store) => store.count());
  } catch {
    return 0;
  }
}

async function removeEntry(clientId: string): Promise<void> {
  await tx("readwrite", (store) => store.delete(clientId));
  notifyChanged();
}

async function recordFailure(entry: QueuedIntake, message: string): Promise<void> {
  await tx("readwrite", (store) =>
    store.put({ ...entry, attempts: entry.attempts + 1, lastError: message }),
  );
  notifyChanged();
}

export type DrainResult = {
  /** Entries accepted by the server and removed from the queue. */
  synced: number;
  /** Entries left in the queue, either still offline or rejected. */
  remaining: number;
  /** visitIds returned by the server, oldest first. */
  visitIds: string[];
};

let draining = false;

/**
 * Try to upload everything in the queue, oldest first.
 *
 * Guarded against concurrent runs, because the page drains on mount, on the
 * `online` event, and on an interval — all three can fire close together.
 *
 * A 4xx means the server understood and rejected the payload; replaying it will
 * never succeed, so the entry is dropped rather than left to retry forever. A
 * network failure or a 5xx leaves it queued.
 *
 * NOTE on double-writes: if a POST actually reached the server but the response
 * was lost in transit, the entry stays queued and the replay writes the visit a
 * second time. `Idempotency-Key` is sent so the route can de-duplicate; it does
 * not do so yet.
 */
export async function drainQueue(): Promise<DrainResult> {
  if (draining) return { synced: 0, remaining: await queueCount(), visitIds: [] };
  draining = true;

  const visitIds: string[] = [];
  let synced = 0;

  try {
    const entries = await listQueue();

    for (const entry of entries) {
      try {
        const res = await fetch("/api/intake", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": entry.clientId,
          },
          body: JSON.stringify(entry.payload),
        });

        const body = (await res.json().catch(() => null)) as
          | { ok?: boolean; visitId?: string; error?: { message?: string } }
          | null;

        if (res.ok && body?.ok) {
          if (body.visitId) visitIds.push(body.visitId);
          await removeEntry(entry.clientId);
          synced += 1;
          continue;
        }

        // Understood and refused — retrying cannot help.
        if (res.status >= 400 && res.status < 500) {
          console.warn(
            `[cortex] dropping queued intake ${entry.clientId}: server rejected it (${res.status})`,
            body?.error?.message,
          );
          await removeEntry(entry.clientId);
          continue;
        }

        await recordFailure(entry, body?.error?.message ?? `Server returned ${res.status}`);
      } catch (error) {
        // Still offline. Stop the pass; the rest will not fare better.
        await recordFailure(entry, error instanceof Error ? error.message : "Network unavailable");
        break;
      }
    }
  } finally {
    draining = false;
  }

  return { synced, remaining: await queueCount(), visitIds };
}

/** True when the browser believes it is offline. Optimistic by design. */
export function isOffline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}
