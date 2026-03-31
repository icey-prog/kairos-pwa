const STATIC_CACHE = 'nk-static-v1'
const API_CACHE = 'nk-api-v1'
const STATIC_ASSETS = ['/', '/manifest.json']

// Install: pre-cache static shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// Activate: prune old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Stale-While-Revalidate for GET API calls (matches any external API origin)
  const isSameOrigin = url.origin === self.location.origin
  if (!isSameOrigin && request.method === 'GET') {
    event.respondWith(staleWhileRevalidate(request, API_CACHE))
    return
  }

  // Cache-first for static assets
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    )
  }
})

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  const revalidate = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone())
      return response
    })
    .catch(() => cached)

  return cached || revalidate
}
