const STATIC_CACHE = "vinfocus-static-v1";
const API_CACHE = "vinfocus-api-v1";

const STATIC_URLS = [
  "/static/css/app.css",
  "/static/css/landing.css",
  "/static/css/common.css",
  "/static/js/app.js",
  "/static/js/landing.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(STATIC_URLS);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  const keepCaches = [STATIC_CACHE, API_CACHE];
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names
          .filter((name) => !keepCaches.includes(name))
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

async function networkFirstWithTimeout(request, timeoutMs = 5000) {
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), timeoutMs)
  );

  try {
    const response = await Promise.race([fetch(request), timeoutPromise]);
    if (response.ok) {
      const clone = response.clone();
      caches.open(API_CACHE).then((cache) => {
        cache.put(request, clone);
      });
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const headers = new Headers(cached.headers);
      headers.set("X-Offline", "true");
      return new Response(cached.body, {
        status: cached.status,
        statusText: cached.statusText,
        headers,
      });
    }
    return new Response(
      JSON.stringify({ error: "You are offline. Showing cached data." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function cacheFirstWithRefresh(request) {
  const cached = await caches.match(request);
  if (cached) {
    fetch(request).then((response) => {
      if (response.ok) {
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, response));
      }
    });
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    const clone = response.clone();
    caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithTimeout(event.request));
    return;
  }

  if (STATIC_URLS.includes(url.pathname)) {
    event.respondWith(cacheFirstWithRefresh(event.request));
    return;
  }

  if (url.pathname.startsWith("/static/")) {
    event.respondWith(cacheFirstWithRefresh(event.request));
    return;
  }
});
