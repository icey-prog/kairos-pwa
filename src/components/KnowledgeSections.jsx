import { groupByCategory } from '../lib/knowledge'

// Level-2 presentation: items grouped into iOS-Settings-style sub-sections by
// knowledge_category. `renderItem(item)` renders one row.
export default function KnowledgeSections({ items, renderItem }) {
  const groups = groupByCategory(items)
  if (groups.length === 0) return null

  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key}>
          {/* Section header */}
          <div className="flex items-center gap-2 px-1 mb-2">
            <g.Icon className="w-4 h-4" style={{ color: g.color }} />
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-[var(--color-foreground)]">{g.label}</h3>
            <span className="text-[12px] text-[var(--color-muted-foreground)]">{g.items.length}</span>
          </div>
          {/* Grouped rows on one rounded surface */}
          <div className="rounded-2xl overflow-hidden glass border-0 divide-y divide-[var(--color-border)]">
            {g.items.map((item) => renderItem(item))}
          </div>
        </section>
      ))}
    </div>
  )
}
