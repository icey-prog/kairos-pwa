import { useState, useEffect } from 'react'
import { Timer, Brain, TrendingUp, Sparkles, CalendarDays, BookOpen, Pencil, Trophy, X, Menu, Moon, Sun } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { haptic } from '../lib/haptic'
import { useScrollLock } from '../hooks/useScrollLock'

// ── Quick-action sheet items (bottom sheet) ──────────────────────────────────
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

// ── FAB speed-dial items (rendered bottom-up, so first = closest to FAB) ────
const DIAL_ITEMS = [
  { id: 'focus',     label: 'Focus',      icon: Timer,      bg: 'bg-blue-500',    ring: 'ring-blue-400'    },
  { id: 'learn',     label: 'Apprendre',  icon: Brain,      bg: 'bg-purple-500',  ring: 'ring-purple-400'  },
  { id: 'dashboard', label: 'Stats',      icon: TrendingUp, bg: 'bg-emerald-500', ring: 'ring-emerald-400' },
  { id: 'search',    label: 'Accès rapide',icon: Sparkles,  bg: 'bg-amber-500',   ring: 'ring-amber-400', isSheet: true },
  { id: 'theme',     label: 'Thème',      icon: Moon,       bg: 'bg-slate-600',   ring: 'ring-slate-400', isTheme: true },
]

// ── Framer variants ──────────────────────────────────────────────────────────
const backdropVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18 } },
  exit:    { opacity: 0, transition: { duration: 0.14 } },
}

const dialContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.045, staggerDirection: 1 } },
  exit:    { transition: { staggerChildren: 0.03,  staggerDirection: -1 } },
}

const dialItemVariants = {
  hidden:  { opacity: 0, y: 16, scale: 0.75 },
  visible: { opacity: 1, y: 0,  scale: 1,   transition: { type: 'spring', stiffness: 520, damping: 28 } },
  exit:    { opacity: 0, y: 10, scale: 0.8, transition: { duration: 0.1, ease: 'easeIn' } },
}

export default function FloatingNav() {
  const mainTab    = useStore((s) => s.mainTab)
  const setMainTab = useStore((s) => s.setMainTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const [open, setOpen]   = useState(false)
  const [sheet, setSheet] = useState(false)
  const [dark, setDark]   = useState(false)

  useScrollLock(sheet || open)   // freeze the page behind the sheet / open dial

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

  const toggleDial = () => {
    haptic.light()
    if (open) { setOpen(false) } else { setOpen(true) }
  }

  const navigate = (item) => {
    haptic.select()
    setOpen(false)
    if (item.isTheme) {
      toggleTheme()
      return
    }
    if (item.isSheet) {
      setTimeout(() => setSheet(true), 120)
      return
    }
    setMainTab(item.id)
  }

  const closeSheet = () => { haptic.light(); setSheet(false) }

  const navigateSheet = (tab, subtab) => {
    haptic.select()
    setMainTab(tab)
    setActiveTab(subtab)
    setSheet(false)
  }

  return (
    <>
      {/* ── Speed-dial FAB ─────────────────────────────────────────────────── */}
      <div className="fixed bottom-8 right-6 z-50 flex flex-col items-end gap-4 pointer-events-none">

        {/* Dial items — staggered upward */}
        <AnimatePresence>
          {open && (
            <motion.div
              variants={dialContainerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex flex-col-reverse gap-3.5 pointer-events-auto"
            >
              {DIAL_ITEMS.map((item) => {
                const Icon = item.isTheme ? (dark ? Sun : Moon) : item.icon
                const isActive = (mainTab === item.id && !item.isSheet && !item.isTheme) || (item.isTheme && dark)
                return (
                  <motion.div
                    key={item.id}
                    variants={dialItemVariants}
                    className="flex items-center gap-3 justify-end"
                  >
                    {/* Label pill */}
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0, transition: { delay: 0.06, duration: 0.18 } }}
                      exit={{ opacity: 0, x: 4, transition: { duration: 0.08 } }}
                      className="text-[13px] font-semibold text-white bg-black/55 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-sm select-none"
                    >
                      {item.isTheme ? (dark ? 'Mode clair' : 'Mode sombre') : item.label}
                    </motion.span>

                    {/* Icon circle */}
                    <button
                      onClick={() => navigate(item)}
                      className={`
                        w-12 h-12 rounded-full shadow-lg flex items-center justify-center
                        transition-transform active:scale-90
                        ring-2 ring-offset-2 ring-transparent
                        ${item.bg}
                        ${isActive ? item.ring : ''}
                      `}
                    >
                      <Icon size={20} strokeWidth={1.75} className="text-white" />
                    </button>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main FAB */}
        <button
          onClick={toggleDial}
          className={`
            pointer-events-auto w-14 h-14 rounded-full shadow-2xl
            flex items-center justify-center
            transition-colors duration-200 active:scale-90
            ${open
              ? 'bg-[var(--color-foreground)]'
              : 'bg-[var(--color-foreground)]'}
          `}
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <motion.div
            animate={{ rotate: open ? 90 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {open
                ? <motion.div key="x"
                    initial={{ opacity: 0, rotate: -45, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0,   scale: 1 }}
                    exit={{    opacity: 0, rotate:  45, scale: 0.6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <X size={22} strokeWidth={2.5} className="text-[var(--color-background)]" />
                  </motion.div>
                : <motion.div key="menu"
                    initial={{ opacity: 0, rotate: 45, scale: 0.6 }}
                    animate={{ opacity: 1, rotate: 0,  scale: 1 }}
                    exit={{    opacity: 0, rotate:-45, scale: 0.6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Menu size={22} strokeWidth={2} className="text-[var(--color-background)]" />
                  </motion.div>
              }
            </AnimatePresence>
          </motion.div>
        </button>
      </div>

      {/* ── Backdrop (closes dial) ──────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="fab-backdrop"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px]"
            onClick={() => { haptic.light(); setOpen(false) }}
          />
        )}
      </AnimatePresence>

      {/* ── Bottom sheet (Accès rapide) ─────────────────────────────────────── */}
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
                <button
                  onClick={closeSheet}
                  className="w-11 h-11 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-[var(--color-muted-foreground)] active:scale-95 transition-transform"
                >
                  <X size={15} strokeWidth={2} />
                </button>
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
