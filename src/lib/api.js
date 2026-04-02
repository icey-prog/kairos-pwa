export const API = 'http://localhost:8000/api'
export const fetcher = (url) => fetch(url).then((r) => r.json())
