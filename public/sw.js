const CACHE_VERSION = "v5";
const SHELL_CACHE = `forge-shell-${CACHE_VERSION}`;
const ASSET_CACHE = `forge-assets-${CACHE_VERSION}`;
const MEDIA_CACHE = "forge-guided-media-v1";
const FORGE_CACHES = new Set([SHELL_CACHE, ASSET_CACHE, MEDIA_CACHE]);
const OFFLINE_FALLBACK = "/";
const PRECACHE_URLS = [
  OFFLINE_FALLBACK,
  "/manifest.webmanifest",
  "/icon.svg",
  "/maskable-icon.svg",
  "/apple-touch-icon.png",
  "/media/pulse-training-hero.webp",
  "/media/exercises/bench-press.webp",
  "/media/exercises/incline-dumbbell-press.webp",
  "/media/exercises/barbell-squat.webp",
  "/media/exercises/romanian-deadlift.webp",
  "/media/exercises/leg-press.webp",
  "/media/exercises/lying-leg-curl.webp",
  "/media/exercises/pull-up.webp",
  "/media/exercises/barbell-row.webp",
  "/media/exercises/neutral-grip-pulldown.webp",
  "/media/exercises/face-pull.webp",
  "/media/exercises/military-press.webp",
  "/media/exercises/cable-lateral-raise.webp",
  "/media/exercises/muscle-up.webp",
  "/media/exercises/front-lever.webp",
  "/media/exercises/back-lever.webp",
  "/media/exercises/planche.webp",
  "/media/exercises/human-flag.webp",
  "/media/exercises/l-sit.webp",
  "/media/exercises/handstand.webp",
  "/icons/icon-192.webp",
  "/icons/icon-512.webp",
];
const MAX_ASSET_ENTRIES = 80;

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShellAndBuildAssets().then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => (name.startsWith("pulse-") || name.startsWith("forge-")) && !FORGE_CACHES.has(name))
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
      new Response("FORGE está offline. Reconecte-se e tente novamente.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      })
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cachedResponse = await cache.match(request) || await (await caches.open(SHELL_CACHE)).match(request);
  if (cachedResponse) return cachedResponse;

  const networkResponse = await fetch(request);
  if (isCacheableResponse(networkResponse)) {
    await cache.put(request, networkResponse.clone());
    await trimCache(cache, MAX_ASSET_ENTRIES);
  }

  return networkResponse;
}

async function cacheShellAndBuildAssets() {
  const shellCache = await caches.open(SHELL_CACHE);
  await shellCache.addAll(PRECACHE_URLS);

  const document = await shellCache.match(OFFLINE_FALLBACK, { ignoreSearch: true });
  if (!document) return;

  const html = await document.text();
  const buildAssets = Array.from(html.matchAll(/(?:src|href)="([^"]+)"/g), (match) => match[1])
    .map((asset) => new URL(asset, self.location.origin))
    .filter((asset) => asset.origin === self.location.origin && asset.pathname.startsWith("/_next/static/"));
  const assetCache = await caches.open(ASSET_CACHE);
  await Promise.all(buildAssets.map(async (asset) => {
    try {
      const response = await fetch(asset);
      if (isCacheableResponse(response)) await assetCache.put(asset, response);
    } catch {
      // The static shell remains available even if one optional chunk cannot be prefetched.
    }
  }));
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
