import { ChevronRight, Pin } from 'lucide-react'
import { haptic } from '../lib/haptic'
import DisciplineGlyph from './DisciplineGlyph'
import { cn } from '../lib/utils'

// Level-1 of the revision hub: a card per discipline that has items.
// `stats[slug] = { total, sub, statusColor?, statusLabel?, order? }`
//   statusColor/Label = dominant review status marker (right side of the card)
//   order = sort key (lower first) — callers put started courses first, finished last
// `onTogglePin` (optional) shows a pin button — pinned disciplines always sort first.
export default function DisciplineHub({ disciplines, stats, onSelect, onTogglePin, emptyLabel }) {
  const withItems = disciplines
    .filter((d) => (stats[d.slug]?.total ?? 0) > 0)
    .sort((a, b) => {
      const pinDiff = (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)
      if (pinDiff !== 0) return pinDiff
      return (stats[a.slug]?.order ?? 0) - (stats[b.slug]?.order ?? 0)
    })

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
            className={cn(
              'w-full flex items-center gap-4 p-4 rounded-2xl border-0 text-left card-hover active:scale-[0.98] transition-transform glass',
              d.pinned && 'ring-2 ring-[var(--color-primary)]/40',
            )}
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${d.color}30, ${d.color}10)` }}
            >
              <DisciplineGlyph discipline={d} size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-[15px] font-bold text-[var(--color-foreground)] truncate">{d.name}</p>
                {d.pinned && <Pin className="w-3.5 h-3.5 text-[var(--color-primary)] flex-shrink-0" fill="currentColor" />}
              </div>
              <p className="text-[12px] text-[var(--color-muted-foreground)] mt-0.5">
                {s.total} {s.total > 1 ? 'éléments' : 'élément'}
                {s.sub ? ` · ${s.sub}` : ''}
              </p>
            </div>
            {onTogglePin && (
              <span
                role="button"
                onClick={(e) => { e.stopPropagation(); haptic.light(); onTogglePin(d) }}
                className="p-2 -m-2 flex-shrink-0 text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] active:scale-90 transition-transform"
              >
                <Pin className="w-4 h-4" fill={d.pinned ? 'currentColor' : 'none'} />
              </span>
            )}
            {s.statusColor && (
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ background: s.statusColor }}
                title={s.statusLabel}
              />
            )}
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
