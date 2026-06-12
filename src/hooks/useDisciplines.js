import useSWR from 'swr'
import { API, fetcher } from '../lib/api'
import { DISCIPLINE_CONFIG } from '../lib/types'

// Single source of truth for disciplines, served by the backend.
// DISCIPLINE_CONFIG (src/lib/types.js) is only a fallback for offline / empty API.
export function useDisciplines() {
  const { data, error } = useSWR(`${API}/disciplines`, fetcher, { refreshInterval: 30000 })

  const fromApi = Array.isArray(data) ? data : null

  // Fallback: synthesize discipline rows from the hardcoded config.
  const fallback = Object.entries(DISCIPLINE_CONFIG).map(([slug, cfg]) => ({
    slug,
    name: cfg.name,
    color: cfg.color,
    icon: cfg.icon ?? 'BookOpen',
    is_active: true,
  }))

  const disciplines = fromApi ?? fallback
  const bySlug = Object.fromEntries(disciplines.map((d) => [d.slug, d]))

  return {
    disciplines,
    bySlug,
    isLoading: !error && !data,
    isFallback: fromApi === null,
  }
}
