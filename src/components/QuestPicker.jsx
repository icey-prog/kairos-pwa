import { useState, useMemo } from 'react'
import useSWR from 'swr'
import Fuse from 'fuse.js'
import { Search, Lightbulb, Brain } from 'lucide-react'
import BottomSheet from './BottomSheet'
import { Input } from '../lib/ui'
import { API, fetcher } from '../lib/api'
import { haptic } from '../lib/haptic'

// Pick an existing Feynman note or SM-2 card to turn into a quest —
// instead of typing a task title by hand. onPick({ type, id, title }).
export default function QuestPicker({ open, onClose, onPick }) {
  const { data: notes = [] } = useSWR(open ? `${API}/feynman` : null, fetcher)
  const { data: cards = [] } = useSWR(open ? `${API}/spaced-cards` : null, fetcher)
  const [search, setSearch] = useState('')

  const items = useMemo(() => [
    ...notes.map((n) => ({ type: 'note', id: n.id, title: n.topic, discipline: n.discipline })),
    ...cards.map((c) => ({ type: 'card', id: c.id, title: c.front, discipline: c.discipline })),
  ], [notes, cards])

  const fuse = useMemo(
    () => new Fuse(items, { keys: ['title'], threshold: 0.35, ignoreLocation: true }),
    [items],
  )

  const q = search.trim()
  const shown = (q ? fuse.search(q).map((r) => r.item) : items).slice(0, 30)

  return (
    <BottomSheet open={open} onClose={onClose} title="Choisir une note ou carte">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        {shown.length === 0 ? (
          <p className="text-sm text-[var(--color-muted-foreground)] text-center py-6">Rien trouvé.</p>
        ) : (
          <div className="max-h-[50vh] overflow-y-auto space-y-1">
            {shown.map((it) => (
              <button
                key={`${it.type}-${it.id}`}
                onClick={() => { haptic.light(); onPick(it); onClose() }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-[var(--color-secondary)] active:opacity-70 transition-colors"
              >
                {it.type === 'note'
                  ? <Lightbulb className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  : <Brain className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                <span className="flex-1 min-w-0 text-[14px] text-[var(--color-foreground)] truncate">{it.title}</span>
                <span className="text-[11px] text-[var(--color-muted-foreground)] flex-shrink-0">{it.discipline}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </BottomSheet>
  )
}
