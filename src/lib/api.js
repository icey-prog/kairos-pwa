export const API = import.meta.env.VITE_API_URL ?? 'https://kairosapi.duckdns.org/api'

const _API_KEY = import.meta.env.VITE_API_KEY ?? ''
const _authHeader = () => (_API_KEY ? { 'X-API-Key': _API_KEY } : {})

export const fetcher = (url) =>
  fetch(url, { headers: _authHeader() }).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
    return r.json()
  })

export const apiFetch = (url, options = {}) => {
  const { headers = {}, ...rest } = options
  return fetch(url, { headers: { ..._authHeader(), ...headers }, ...rest })
}
