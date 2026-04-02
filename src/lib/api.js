export const API = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'
export const fetcher = (url) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
    return r.json()
  })
