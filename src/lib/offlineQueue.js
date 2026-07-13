import { openDB } from 'idb'

// Mutations that failed on a dead network wait here (IndexedDB, never
// localStorage) and are replayed in order when the connection returns.
const dbPromise = openDB('mile-offline', 1, {
  upgrade(db) {
    db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
  },
})

const listeners = new Set()
const notify = async () => {
  const n = await pendingCount()
  listeners.forEach((cb) => cb(n))
}

export async function enqueue({ url, method, headers, body }) {
  const db = await dbPromise
  await db.add('pending', { url, method, headers, body, queued_at: new Date().toISOString() })
  notify()
}

export async function pendingCount() {
  const db = await dbPromise
  return db.count('pending')
}

/** Subscribe to queue-size changes (network banner). Returns unsubscribe. */
export function onCountChange(cb) {
  listeners.add(cb)
  pendingCount().then(cb)
  return () => listeners.delete(cb)
}

let flushing = false

/** Replay pending mutations in insertion order. Stops at the first network
 * failure (still offline); drops entries the server rejects (4xx/5xx) so a
 * poison request can't block the queue forever. */
export async function flush() {
  if (flushing || !navigator.onLine) return
  flushing = true
  try {
    const db = await dbPromise
    const keys = await db.getAllKeys('pending')
    for (const key of keys) {
      const item = await db.get('pending', key)
      if (!item) continue
      try {
        await fetch(item.url, { method: item.method, headers: item.headers, body: item.body })
        await db.delete('pending', key)
      } catch {
        break
      }
    }
  } finally {
    flushing = false
    notify()
  }
}

window.addEventListener('online', flush)
