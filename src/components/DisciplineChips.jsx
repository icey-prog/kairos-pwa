import { resolveIcon } from '../lib/disciplineIcons'
import { haptic } from '../lib/haptic'
import { cn } from '../lib/utils'

// Horizontal scrollable discipline filter chips.
// `selected` is a slug or 'all'. `counts` optionally maps slug → number.
export default function DisciplineChips({ disciplines, selected, onSelect, counts }) {
  const pick = (slug) => {
    haptic.select()
    onSelect(slug)
  }

  const Chip = ({ slug, label, color, Icon, count }) => {
    const active = selected === slug
    return (
      <button
        onClick={() => pick(slug)}
        className={cn(
          'flex items-center gap-1.5 px-3.5 min-h-[40px] rounded-full text-[13px] font-semibold',
          'whitespace-nowrap flex-shrink-0 transition-all active:scale-95',
          active ? 'text-white shadow-sm' : 'text-[var(--color-foreground)] glass border border-[var(--color-border)]',
        )}
        style={active && color ? { background: color } : undefined}
      >
        {Icon && <Icon className="w-3.5 h-3.5" style={!active && color ? { color } : undefined} />}
        {label}
        {typeof count === 'number' && (
          <span className={cn('text-[11px] tabular-nums', active ? 'opacity-80' : 'text-[var(--color-muted-foreground)]')}>
            {count}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Chip slug="all" label="Toutes" count={counts?.all} />
      {disciplines.map((d) => (
        <Chip
          key={d.slug}
          slug={d.slug}
          label={d.name}
          color={d.color}
          Icon={resolveIcon(d.icon)}
          count={counts?.[d.slug]}
        />
      ))}
    </div>
  )
}
