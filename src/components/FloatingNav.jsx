import { useState, useEffect } from 'react'
import { Timer, Brain, TrendingUp, Sparkles, CalendarDays, BookOpen, Pencil, Trophy, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { cn } from '../lib/utils'
import { haptic } from '../lib/haptic'

const QUICK_ACTIONS = [
  {
    icon: Timer,
    label: 'Chrono',
    sub: 'Lance le focus',
    tab: 'focus', subtab: 'timer',
    bg: 'bg-blue-50',    iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',    textColor: 'text-blue-500',
  },
  {
    icon: CalendarDays,
    label: 'Planifier',
    sub: 'Organise ta journée',
    tab: 'focus', subtab: 'planner',
    bg: 'bg-orange-50',  iconBg: 'bg-orange-100',  iconColor: 'text-orange-600',  textColor: 'text-orange-500',
  },
  {
    icon: BookOpen,
    label: 'Flashcards',
    sub: 'Révision espacée',
    tab: 'learn', subtab: 'sr',
    bg: 'bg-purple-50',  iconBg: 'bg-purple-100',  iconColor: 'text-purple-600',  textColor: 'text-purple-500',
  },
  {
    icon: Pencil,
    label: 'Feynman',
    sub: 'Explique un concept',
    tab: 'learn', subtab: 'feynman',
    bg: 'bg-pink-50',    iconBg: 'bg-pink-100',    iconColor: 'text-pink-600',    textColor: 'text-pink-500',
  },
  {
    icon: TrendingUp,
    label: 'Ma semaine',
    sub: 'Progression hebdo',
    tab: 'dashboard', subtab: 'week',
    bg: 'bg-emerald-50', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', textColor: 'text-emerald-500',
  },
  {
    icon: Trophy,
    label: 'Hauts faits',
    sub: 'Mes badges XP',
    tab: 'dashboard', subtab: 'badges',
    bg: 'bg-amber-50',   iconBg: 'bg-amber-100',   iconColor: 'text-amber-600',   textColor: 'text-amber-500',
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

  const navigate = (tab, subtab) => {
    haptic.select()
    setMainTab(tab)
    setActiveTab(subtab)
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
                  onClick={() => { haptic.light(); setOpen(true) }}
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
                  onClick={() => { haptic.light(); setOpen(false) }}
                  className="w-11 h-11 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-[var(--color-muted-foreground)] active:scale-95 transition-transform"
                >
                  <X size={15} strokeWidth={2} />
                </button>
              </div>

              {/* Actions grid */}
              <div className="px-4 pb-8">
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_ACTIONS.map((item) => {
                    const Icon = item.icon
                    const isActive = mainTab === item.tab
                    return (
                      <button
                        key={item.label}
                        onClick={() => navigate(item.tab, item.subtab)}
                        className={cn(
                          "flex items-center gap-3 p-3.5 rounded-2xl text-left transition-all active:scale-[0.97] active:opacity-80",
                          isActive ? item.bg + ' ring-1 ring-inset ring-black/5' : item.bg
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", item.iconBg)}>
                          <Icon size={18} strokeWidth={1.75} className={item.iconColor} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[#111] leading-tight truncate">{item.label}</p>
                          <p className={cn("text-[11px] leading-tight mt-0.5 truncate", item.textColor)}>{item.sub}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
