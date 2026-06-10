export const API = import.meta.env.VITE_API_URL ?? 'https://kairosapi.duckdns.org:8443/api'
export const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
    return r.json()
  })
