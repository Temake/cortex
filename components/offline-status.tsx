/**
 * Service-worker registration, the queue hook, and the connectivity banner.
 *
 * The banner is mounted once in the root layout so it is visible from every
 * screen — a nurse who queued three visits at the Health Centre should see that
 * from anywhere in the app, not only on the intake form.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudOff, RefreshCw, UploadCloud, WifiOff } from "lucide-react";

import { drainQueue, isOffline, QUEUE_EVENT, queueCount } from "@/lib/offline-queue";
import { cx } from "./ui";

/* ── Service worker ───────────────────────────────────────────────── */

/**
 * Registers /sw.js.
 *
 * Registered in every environment, not just production: the whole point of this
 * feature is being able to demonstrate offline behaviour, and gating it to
 * production would mean it cannot be shown from `next dev`. The worker ignores
 * `/_next/webpack-hmr` so hot reload still works.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((registration) => {
          // If an update is already waiting, activate it rather than leaving the
          // user on a stale shell until every tab closes.
          if (registration.waiting) registration.waiting.postMessage("SKIP_WAITING");
        })
        .catch((error) => {
          console.warn("[cortex] service worker registration failed:", error);
        });
    };

    // Registering after load keeps the worker off the critical path.
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}

/* ── Queue hook ───────────────────────────────────────────────────── */

const DRAIN_INTERVAL_MS = 30_000;

export function useOfflineQueue() {
  const [count, setCount] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    setCount(await queueCount());
  }, []);

  const sync = useCallback(async () => {
    if (isOffline()) return;
    setSyncing(true);
    try {
      await drainQueue();
    } finally {
      setSyncing(false);
      await refresh();
    }
  }, [refresh]);

  useEffect(() => {
    setOnline(!isOffline());
    void refresh();

    const onOnline = () => {
      setOnline(true);
      void sync();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener(QUEUE_EVENT, refresh as EventListener);

    // A safety net: `online` does not fire for every kind of recovery (a captive
    // portal, or a connection that was never reported as lost).
    const timer = setInterval(() => {
      if (!isOffline()) void sync();
    }, DRAIN_INTERVAL_MS);

    // Drain on arrival, in case the app was reopened with items still queued.
    if (!isOffline()) void sync();

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener(QUEUE_EVENT, refresh as EventListener);
      clearInterval(timer);
    };
  }, [refresh, sync]);

  return { count, online, syncing, sync, refresh };
}

/* ── Banner ───────────────────────────────────────────────────────── */

export function OfflineBanner() {
  const { count, online, syncing, sync } = useOfflineQueue();

  // Nothing to say when we are online with an empty queue.
  if (online && count === 0) return null;

  const tone = !online ? "offline" : "pending";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cx(
        "sticky top-16 z-40 border-b px-5 py-2.5 text-[0.8125rem] sm:px-8",
        tone === "offline"
          ? "border-warn-line bg-warn-soft text-warn"
          : "border-accent-line bg-accent-soft text-accent",
      )}
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5">
        {!online ? (
          <>
            <WifiOff size={14} className="shrink-0" aria-hidden />
            <span className="font-medium">No connection.</span>
            <span>
              {count > 0
                ? `${count} visit${count === 1 ? "" : "s"} saved on this device — they'll upload when you're back online.`
                : "Intake still works. Anything you log is saved here and uploads later."}
            </span>
          </>
        ) : (
          <>
            {syncing ? (
              <RefreshCw size={14} className="shrink-0 animate-spin" aria-hidden />
            ) : (
              <UploadCloud size={14} className="shrink-0" aria-hidden />
            )}
            <span className="font-medium">
              {syncing ? "Uploading…" : `${count} visit${count === 1 ? "" : "s"} waiting to upload.`}
            </span>
            {!syncing ? (
              <button
                type="button"
                onClick={() => void sync()}
                className="font-medium underline decoration-current/40 underline-offset-2 transition-opacity hover:opacity-70"
              >
                Upload now
              </button>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Inline card, for the intake page ─────────────────────────────── */

/** A calmer, in-page version of the same state, shown above the intake form. */
export function OfflineNotice() {
  const { count, online } = useOfflineQueue();

  if (online && count === 0) return null;

  return (
    <div className={cx("alert", online ? "alert-minor" : "alert-moderate")}>
      <div className="flex items-start gap-3">
        <CloudOff size={18} className="mt-0.5 shrink-0" aria-hidden />
        <div>
          <p className="font-medium">
            {online
              ? `${count} queued visit${count === 1 ? "" : "s"} still uploading`
              : "Working offline"}
          </p>
          <p className="mt-1 text-[0.875rem] leading-relaxed">
            {online
              ? "You can keep logging visits — the queue clears in the background."
              : "Keep logging visits as normal. Each one is saved on this device and uploads by itself once you have signal."}
          </p>
        </div>
      </div>
    </div>
  );
}
