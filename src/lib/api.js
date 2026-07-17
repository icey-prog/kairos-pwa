import { enqueue } from './offlineQueue'

export const API = import.meta.env.VITE_API_URL ?? 'https://kairosapi.duckdns.org/api'

const _API_KEY = import.meta.env.VITE_API_KEY ?? ''
const _authHeader = () => {
  const headers = _API_KEY ? { 'X-API-Key': _API_KEY } : {}
  const userToken = localStorage.getItem('mile_user_token')
  if (userToken) headers['X-User-Token'] = userToken
  return headers
}

const MUTATIONS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

export const fetcher = (url) =>
  fetch(url, { headers: _authHeader() }).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
    return r.json()
  })

export const apiFetch = async (url, options = {}) => {
  const { headers = {}, ...rest } = options
  const merged = { ..._authHeader(), ...headers }
  try {
    return await fetch(url, { headers: merged, ...rest })
  } catch (err) {
    // fetch() throws only on network failure (never on HTTP errors) — queue
    // mutations for replay instead of losing them; 202 tells callers "accepted,
    // will sync". GETs keep throwing: SWR/SW cache already covers reads.
    // ponytail: chained mutations (create → then patch the returned id) still
    // degrade offline — the follow-up queues a bogus URL the server will 404,
    // which flush() drops. Acceptable at this app's scale.
    const method = (rest.method || 'GET').toUpperCase()
    if (MUTATIONS.has(method)) {
      await enqueue({ url, method, headers: merged, body: rest.body ?? null })
      return new Response(JSON.stringify({ queued: true }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    throw err
  }
}
