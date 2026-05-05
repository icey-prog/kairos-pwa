const STATIC_CACHE = 'nk-static-v2'
const API_CACHE = 'nk-api-v2'
const STATIC_ASSETS = ['/', '/manifest.json', '/offline.html']

// Scheduled notification timers keyed by taskId
const scheduledTimers = new Map()

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

  // Stale-While-Revalidate for GET API calls (cross-origin)
  const isSameOrigin = url.origin === self.location.origin
  if (!isSameOrigin && request.method === 'GET') {
    event.respondWith(staleWhileRevalidate(request, API_CACHE))
    return
  }

  // Network-first for HTML navigation — fall back to offline page
  if (request.method === 'GET' && request.headers.get('Accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const cache = caches.open(STATIC_CACHE)
          cache.then((c) => c.put(request, res.clone()))
          return res
        })
        .catch(() => caches.match('/offline.html'))
    )
    return
  }

  // Cache-first for static assets
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request))
    )
  }
})

// Schedule / cancel notifications from the page
self.addEventListener('message', (event) => {
  const { type, taskId, title, reminderTime } = event.data || {}

  if (type === 'SCHEDULE_NOTIFICATION') {
    const delay = new Date(reminderTime).getTime() - Date.now()
    if (delay <= 0) return

    if (scheduledTimers.has(taskId)) clearTimeout(scheduledTimers.get(taskId))

    const timerId = setTimeout(() => {
      self.registration.showNotification('⏰ ' + title, {
        body: 'Heure de commencer — lance le chrono',
        icon: '/logo_kaizen.jpg',
        badge: '/logo_kaizen.jpg',
        tag: `task-${taskId}`,
        data: { taskId },
        actions: [{ action: 'start', title: '▶ Démarrer' }],
        requireInteraction: true,
      })
      scheduledTimers.delete(taskId)
    }, delay)

    scheduledTimers.set(taskId, timerId)
  }

  if (type === 'CANCEL_NOTIFICATION') {
    if (scheduledTimers.has(taskId)) {
      clearTimeout(scheduledTimers.get(taskId))
      scheduledTimers.delete(taskId)
    }
  }
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { taskId } = event.notification.data || {}

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        clientList[0].focus()
        clientList[0].postMessage({ type: 'FOCUS_TASK', taskId })
      } else {
        clients.openWindow(taskId ? `/?focus=${taskId}` : '/')
      }
    })
  )
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
