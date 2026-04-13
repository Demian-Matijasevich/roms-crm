// Bump this on every deploy to invalidate stale caches
const CACHE_NAME = "roms-crm-v3";
const STATIC_ASSETS = ["/offline"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(STATIC_ASSETS).catch(() => null))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // HTML navigations: always network, fall back to offline only on failure
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    e.respondWith(fetch(req).catch(() => caches.match("/offline")));
    return;
  }

  // Next.js build chunks: always network (hashes change per deploy)
  if (url.pathname.startsWith("/_next/")) {
    e.respondWith(fetch(req));
    return;
  }

  // API: network-first
  if (url.pathname.startsWith("/api/")) {
    e.respondWith(fetch(req).catch(() => caches.match(req)));
    return;
  }

  // Other static assets: cache-first
  e.respondWith(caches.match(req).then((cached) => cached || fetch(req)));
});
