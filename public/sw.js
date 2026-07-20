const CACHE_VERSION = "v2";
const SHELL_CACHE = `pulse-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `pulse-assets-${CACHE_VERSION}`;
const MEDIA_CACHE = "pulse-guided-media-v1";
const PULSE_CACHES = new Set([SHELL_CACHE, ASSET_CACHE, MEDIA_CACHE]);
const OFFLINE_FALLBACK = "/";
const PRECACHE_URLS = [
  OFFLINE_FALLBACK,
  "/manifest.webmanifest",
  "/icon.svg",
  "/maskable-icon.svg",
  "/apple-touch-icon.png",
  "/media/pulse-training-hero.webp",
  "/icons/icon-192.webp",
  "/icons/icon-512.webp",
];
const MAX_ASSET_ENTRIES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name.startsWith("pulse-") && !PULSE_CACHES.has(name))
            .map((name) => caches.delete(name)),
        ),
      ),
      self.clients.claim(),
    ]),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isPrivateOrDynamicRequest(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(request, url)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

function isPrivateOrDynamicRequest(request, url) {
  return (
    request.headers.has("authorization") ||
    request.headers.has("range") ||
    url.pathname === "/sw.js" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/_next/data/")
  );
}

function isStaticAsset(request, url) {
  return (
    ["style", "script", "image", "font"].includes(request.destination) ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest"
  );
}

async function networkFirstNavigation(request) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(SHELL_CACHE);
    const fallback = await cache.match(OFFLINE_FALLBACK, { ignoreSearch: true });

    return (
      fallback ||
      new Response("Pulse está offline. Reconecte-se e tente novamente.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  const networkResponse = await fetch(request);
  if (isCacheableResponse(networkResponse)) {
    await cache.put(request, networkResponse.clone());
    await trimCache(cache, MAX_ASSET_ENTRIES);
  }

  return networkResponse;
}

function isCacheableResponse(response) {
  const cacheControl = response.headers.get("Cache-Control") || "";

  return (
    response.ok &&
    response.type === "basic" &&
    !/(?:no-store|private)/i.test(cacheControl) &&
    !response.headers.has("Set-Cookie")
  );
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  const overflow = keys.length - maxEntries;

  if (overflow > 0) {
    await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
  }
}
