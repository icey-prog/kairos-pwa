import { useState, useEffect } from 'react'
import { Timer, Brain, TrendingUp, Sparkles, CalendarDays, BookOpen, Pencil, Trophy, X, Moon, Sun } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { haptic } from '../lib/haptic'
import { useScrollLock } from '../hooks/useScrollLock'
import GlassSurface from './GlassSurface/GlassSurface'

// ── Quick-action sheet items (opened from the "Plus" tab) ───────────────────
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

// ── Primary nav tabs — the only 3 real destinations + one "more" entry ──────
const NAV_ITEMS = [
  { id: 'focus',     label: 'Focus',     icon: Timer },
  { id: 'learn',     label: 'Apprendre', icon: Brain },
  { id: 'dashboard', label: 'Stats',     icon: TrendingUp },
]

export default function BottomNav() {
  const mainTab       = useStore((s) => s.mainTab)
  const setMainTab    = useStore((s) => s.setMainTab)
  const setActiveTab  = useStore((s) => s.setActiveTab)
  const [sheet, setSheet] = useState(false)
  const [dark, setDark]   = useState(false)

  useScrollLock(sheet)

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark'
    setDark(saved)
    if (saved) document.documentElement.classList.add('dark-mode')
  }, [])

  const toggleTheme = () => {
    haptic.medium()
    const next = !dark
    setDark(next)
    if (next) {
      document.documentElement.classList.add('dark-mode')
      localStorage.setItem('theme', 'dark')
    } else {
      document.documentElement.classList.remove('dark-mode')
      localStorage.setItem('theme', 'light')
    }
  }

  const selectTab = (id) => {
    haptic.select()
    setMainTab(id)
  }

  const openSheet = () => { haptic.light(); setSheet(true) }
  const closeSheet = () => { haptic.light(); setSheet(false) }

  const navigateSheet = (tab, subtab) => {
    haptic.select()
    setMainTab(tab)
    setActiveTab(subtab)
    setSheet(false)
  }

  return (
    <>
      {/* ── Bottom nav bar ──────────────────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <GlassSurface width="100%" height={64} borderRadius={32}>
            <nav className="flex items-center justify-around w-full h-full px-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon
                const isActive = mainTab === item.id
                return (
                  <button
                    key={item.id}
                    onClick={() => selectTab(item.id)}
                    className="relative flex flex-col items-center justify-center flex-1 h-full"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="bottomnav-active"
                        className="absolute inset-y-2 inset-x-1 rounded-2xl bg-[var(--color-foreground)]/10"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <Icon
                      size={20}
                      strokeWidth={isActive ? 2.25 : 1.75}
                      className={`relative transition-colors ${isActive ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}
                    />
                    <span className={`relative text-[10px] mt-0.5 font-medium transition-colors ${isActive ? 'text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]'}`}>
                      {item.label}
                    </span>
                  </button>
                )
              })}

              <button
                onClick={openSheet}
                className="relative flex flex-col items-center justify-center flex-1 h-full"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <Sparkles size={20} strokeWidth={1.75} className="text-[var(--color-muted-foreground)]" />
                <span className="text-[10px] mt-0.5 font-medium text-[var(--color-muted-foreground)]">Plus</span>
              </button>
            </nav>
          </GlassSurface>
        </div>
      </div>

      {/* ── Bottom sheet (Accès rapide + thème) ─────────────────────────────── */}
      <AnimatePresence>
        {sheet && (
          <>
            <motion.div
              key="sheet-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={closeSheet}
            />

            <motion.div
              key="sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-background)] rounded-t-3xl shadow-2xl pb-safe"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
              </div>

              <div className="flex items-center justify-between px-5 py-3">
                <h2 className="text-[15px] font-bold text-[var(--color-foreground)]">Accès rapide</h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleTheme}
                    className="w-11 h-11 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-[var(--color-muted-foreground)] active:scale-95 transition-transform"
                  >
                    {dark ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
                  </button>
                  <button
                    onClick={closeSheet}
                    className="w-11 h-11 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-[var(--color-muted-foreground)] active:scale-95 transition-transform"
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                </div>
              </div>

              <div className="px-4 pb-8">
                <div className="grid grid-cols-2 gap-3">
                  {QUICK_ACTIONS.map((item) => {
                    const Icon = item.icon
                    const isActive = mainTab === item.tab
                    return (
                      <button
                        key={item.label}
                        onClick={() => navigateSheet(item.tab, item.subtab)}
                        className={`
                          flex items-center gap-3 p-3.5 rounded-2xl text-left
                          transition-all active:scale-[0.97] active:opacity-80
                          ${isActive ? item.bg + ' ring-1 ring-inset ring-black/5' : item.bg}
                        `}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.iconBg}`}>
                          <Icon size={18} strokeWidth={1.75} className={item.iconColor} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-[var(--color-foreground)] leading-tight truncate">{item.label}</p>
                          <p className={`text-[11px] leading-tight mt-0.5 truncate ${item.textColor}`}>{item.sub}</p>
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
