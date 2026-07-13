import { API, apiFetch } from './api'

// A quest can point at a revision item via the existing Task.resources field:
// "note:91" (Feynman) or "card:12" (SM-2). No backend change needed.
export const parseQuestLink = (resources) => {
  const m = /^(note|card):(\d+)$/.exec(resources || '')
  return m ? { type: m[1], id: Number(m[2]) } : null
}

/** Creates a task linked to a note/card. Returns the created task (or null). */
export async function createLinkedQuest({ title, type, id, minutes = 25 }) {
  const res = await apiFetch(`${API}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: title.slice(0, 200),
      target_minutes: minutes,
      category: 'learn',
      resources: `${type}:${id}`,
      scheduled_date: new Date().toISOString().slice(0, 10),
    }),
  })
  if (!res.ok) throw new Error(`create linked quest failed: ${res.status}`)
  return res.json()
}
