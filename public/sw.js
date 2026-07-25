/*
 * Cortex service worker.
 *
 * Scope: served from /, so it controls the whole app.
 *
 * Strategy, by request kind:
 *   - non-GET            -> never touched. Intake POSTs must reach the network or
 *                           fail fast so the client can queue them in IndexedDB.
 *                           Silently replaying a POST here would double-write
 *                           events onto the twin.
 *   - /_next/static/*    -> cache-first. Content-hashed, so it can never go stale.
 *   - navigations        -> network-first, fall back to the cached document, then
 *                           to /offline.html.
 *   - /api/* GETs        -> network-first with a cache fallback, so the clusters
 *                           preview still renders offline.
 *   - everything else    -> stale-while-revalidate.
 *
 * Bump CACHE_VERSION to invalidate every old cache on the next activation.
 */

const CACHE_VERSION = "cortex-v1";
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

/** Precached on install. Kept small — these are the screens used offline. */
const SHELL_URLS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Individually, so one 404 cannot fail the whole install.
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(new Request(url, { cache: "reload" }))));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => !k.startsWith(CACHE_VERSION)).map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

/** Lets the page trigger an immediate activation after an update. */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon") ||
    url.pathname === "/apple-touch-icon.png" ||
    /\.(?:png|svg|jpg|jpeg|webp|woff2?|ico)$/.test(url.pathname)
  );
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    // Opaque/error responses are not worth storing.
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;

    if (fallbackUrl) {
      const shell = await caches.open(SHELL_CACHE);
      const offline = await shell.match(fallbackUrl);
      if (offline) return offline;
    }
    throw new Error("offline and nothing cached");
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);

  const refresh = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);

  return hit ?? (await refresh) ?? Promise.reject(new Error("offline"));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only same-origin GETs are ours to manage.
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  // Never interfere with dev tooling or hot reload.
  if (url.pathname.startsWith("/_next/webpack-hmr")) return;

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request, RUNTIME_CACHE, "/offline.html"));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});
