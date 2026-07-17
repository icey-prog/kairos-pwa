import useSWR, { mutate } from 'swr'
import { API, fetcher, apiFetch } from '../lib/api'
import { DISCIPLINE_CONFIG } from '../lib/types'

// Accept any of: bare array (FastAPI List response), {disciplines:[...]}, {data:[...]}.
function extractList(data) {
  if (Array.isArray(data)) return data
  if (data && Array.isArray(data.disciplines)) return data.disciplines
  if (data && Array.isArray(data.data)) return data.data
  return null
}

// Single source of truth for disciplines, served by the backend.
// DISCIPLINE_CONFIG (src/lib/types.js) is only a fallback for offline / empty API.
export function useDisciplines() {
  // Bibliothèque partagée, mais filtrée aux disciplines choisies par ce user à l'onboarding.
  const { data, error } = useSWR(`${API}/user/disciplines`, fetcher, { refreshInterval: 30000 })

  const list = extractList(data)
  // Only treat a non-empty API list as authoritative; empty/garbage → fallback.
  const fromApi = list && list.length > 0
    ? list.filter((d) => d && d.slug && d.is_active !== false)
    : null

  // Fallback: synthesize discipline rows from the hardcoded config.
  const fallback = Object.entries(DISCIPLINE_CONFIG).map(([slug, cfg]) => ({
    slug,
    name: cfg.name,
    color: cfg.color,
    icon: cfg.icon ?? 'BookOpen',
    is_active: true,
  }))

  if (import.meta.env.DEV && fromApi === null && data !== undefined) {
    // Helps diagnose why chips show the 3-item fallback instead of the seeded set.
    console.warn('[useDisciplines] API response not a usable list — using fallback. Got:', data, 'error:', error)
  }

  const disciplines = fromApi ?? fallback
  const bySlug = Object.fromEntries(disciplines.map((d) => [d.slug, d]))

  // Épinglage : discipline à réviser en priorité — remonte en tête du hub.
  const togglePin = async (discipline) => {
    if (!discipline?.id) return
    try {
      const res = await apiFetch(`${API}/user/disciplines/${discipline.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !discipline.pinned }),
      })
      if (!res.ok) throw new Error(`toggle pin failed: ${res.status}`)
      mutate(`${API}/user/disciplines`)
    } catch (err) {
      console.error('[useDisciplines.togglePin]', err)
    }
  }

  return {
    disciplines,
    bySlug,
    togglePin,
    isLoading: !error && !data,
    isFallback: fromApi === null,
  }
}
