import { levelMeta, categoryMeta } from '../lib/knowledge'

// Renders level + knowledge_category badges for a card or note.
// Legacy items (both null) render nothing. `compact` shows tiny dots for list rows.
export default function KnowledgeBadges({ item, compact = false }) {
  const lvl = levelMeta(item?.level)
  const cat = categoryMeta(item?.knowledge_category)
  if (!lvl && !cat) return null

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 flex-shrink-0">
        {lvl && <span className="w-2 h-2 rounded-full" style={{ background: lvl.color }} title={lvl.label} />}
        {cat && <cat.Icon className="w-3.5 h-3.5" style={{ color: cat.color }} />}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {lvl && (
        <span
          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${lvl.color}20`, color: lvl.color }}
        >
          {lvl.label}
        </span>
      )}
      {cat && (
        <span
          className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
          style={{ background: `${cat.color}20`, color: cat.color }}
        >
          <cat.Icon className="w-3 h-3" />
          {cat.label}
        </span>
      )}
    </div>
  )
}
