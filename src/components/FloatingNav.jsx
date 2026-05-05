import { useState, useEffect } from 'react'
import { Timer, Brain, TrendingUp, Sparkles, CalendarDays, BookOpen, Pencil, Trophy, X, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { cn } from '../lib/utils'

const QUICK_ACTIONS = [
  {
    section: 'Focus',
    items: [
      { icon: Timer,       label: 'Lancer le chrono',     tab: 'focus',     sub: 'timer' },
      { icon: CalendarDays,label: 'Planifier ma journée', tab: 'focus',     sub: 'planner' },
    ],
  },
  {
    section: 'Apprendre',
    items: [
      { icon: BookOpen,    label: 'Réviser mes flashcards', tab: 'learn',    sub: 'sr' },
      { icon: Pencil,      label: 'Note Feynman',           tab: 'learn',    sub: 'feynman' },
    ],
  },
  {
    section: 'Progression',
    items: [
      { icon: TrendingUp,  label: 'Ma semaine',             tab: 'dashboard', sub: 'week' },
      { icon: Trophy,      label: 'Mes hauts faits',        tab: 'dashboard', sub: 'badges' },
    ],
  },
]

export default function FloatingNav() {
  const mainTab = useStore((s) => s.mainTab)
  const setMainTab = useStore((s) => s.setMainTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const navigate = (tab, sub) => {
    setMainTab(tab)
    setActiveTab(sub)
    setOpen(false)
  }

  const navItems = [
    { id: 'focus',     label: 'Focus',     icon: Timer },
    { id: 'search',    label: 'Accès rapide', icon: Sparkles, center: true },
    { id: 'learn',     label: 'Apprendre', icon: Brain },
    { id: 'dashboard', label: 'Stats',     icon: TrendingUp },
  ]

  return (
    <>
      {/* Nav bar */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center pointer-events-none w-full px-6">
        <nav className={cn(
          "pointer-events-auto h-16 px-2 flex items-center gap-1 rounded-full",
          "transition-all duration-300 ease-in-out",
          "bg-white/70 backdrop-blur-2xl backdrop-saturate-[1.8] border border-white/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(255,255,255,0.5)]",
          "glass-mode:bg-black/50 glass-mode:border-white/10 glass-mode:text-white"
        )}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = mainTab === item.id || (item.center && open)

            if (item.center) {
              return (
                <button
                  key={item.id}
                  onClick={() => setOpen(true)}
                  className={cn(
                    "relative w-14 h-14 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all duration-200",
                    "active:scale-95",
                    isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"
                  )}
                >
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                  <span className="text-[9px] font-medium leading-none">{item.label}</span>
                </button>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => setMainTab(item.id)}
                className={cn(
                  "relative w-14 h-14 flex flex-col items-center justify-center gap-0.5 rounded-full transition-all duration-200",
                  "active:scale-95",
                  isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted-foreground)]"
                )}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[9px] font-medium leading-none">{item.label}</span>
                {isActive && (
                  <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-[var(--color-primary)]" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Bottom sheet */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-background)] rounded-t-3xl shadow-2xl pb-safe"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3">
                <h2 className="text-[15px] font-bold text-[var(--color-foreground)]">Accès rapide</h2>
                <button
                  onClick={() => setOpen(false)}
                  className="w-8 h-8 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-[var(--color-muted-foreground)] active:scale-95 transition-transform"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>

              {/* Actions */}
              <div className="px-4 pb-8 space-y-4">
                {QUICK_ACTIONS.map(({ section, items }) => (
                  <div key={section}>
                    <p className="text-[10px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest px-1 mb-1.5">
                      {section}
                    </p>
                    <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)]/50 overflow-hidden">
                      {items.map((item, i) => {
                        const Icon = item.icon
                        const isActive = mainTab === item.tab
                        return (
                          <button
                            key={item.label}
                            onClick={() => navigate(item.tab, item.sub)}
                            className={cn(
                              "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-all active:scale-[0.99] active:opacity-70",
                              i > 0 && "border-t border-[var(--color-border)]/40",
                              isActive ? "bg-[var(--color-primary)]/5" : "hover:bg-[var(--color-secondary)]/60"
                            )}
                          >
                            <div className={cn(
                              "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
                              isActive ? "bg-[var(--color-primary)]/15" : "bg-[var(--color-secondary)]"
                            )}>
                              <Icon size={17} strokeWidth={1.75} className={isActive ? "text-[var(--color-primary)]" : "text-[var(--color-foreground)]"} />
                            </div>
                            <span className={cn(
                              "text-[14px] font-medium flex-1",
                              isActive ? "text-[var(--color-primary)]" : "text-[var(--color-foreground)]"
                            )}>
                              {item.label}
                            </span>
                            <ChevronRight size={15} className="text-[var(--color-muted-foreground)] flex-shrink-0" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
