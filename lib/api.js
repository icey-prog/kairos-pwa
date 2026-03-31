export const API = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000') + '/api'
export const fetcher = (url) => fetch(url).then((r) => r.json())
