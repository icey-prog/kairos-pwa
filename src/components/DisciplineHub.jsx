import { ChevronRight } from 'lucide-react'
import { haptic } from '../lib/haptic'
import DisciplineGlyph from './DisciplineGlyph'

// Level-1 of the revision hub: a card per discipline that has items.
// `stats[slug] = { total, sub }` — total = item count, sub = secondary line (e.g. "3 à réviser").
export default function DisciplineHub({ disciplines, stats, onSelect, emptyLabel }) {
  const withItems = disciplines.filter((d) => (stats[d.slug]?.total ?? 0) > 0)

  if (withItems.length === 0) {
    return (
      <p className="text-sm text-[var(--color-muted-foreground)] text-center py-10">
        {emptyLabel}
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {withItems.map((d) => {
        const s = stats[d.slug] || {}
        return (
          <button
            key={d.slug}
            onClick={() => { haptic.light(); onSelect(d.slug) }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl glass border-0 text-left card-hover active:scale-[0.98] transition-transform"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${d.color}30, ${d.color}10)` }}
            >
              <DisciplineGlyph discipline={d} size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-[var(--color-foreground)] truncate">{d.name}</p>
              <p className="text-[12px] text-[var(--color-muted-foreground)] mt-0.5">
                {s.total} {s.total > 1 ? 'éléments' : 'élément'}
                {s.sub ? ` · ${s.sub}` : ''}
              </p>
            </div>
            {s.dueBadge > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 flex-shrink-0">
                {s.dueBadge}
              </span>
            )}
            <ChevronRight className="w-5 h-5 text-[var(--color-muted-foreground)] flex-shrink-0" />
          </button>
        )
      })}
    </div>
  )
}
