import { useState, useEffect } from 'react'
import { Menu, X, Moon, Sun, Timer, CalendarDays, BookOpen, NotebookPen, Infinity, Trophy } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { haptic } from '../lib/haptic'
import { useScrollLock } from '../hooks/useScrollLock'
import OptionWheel from './OptionWheel/OptionWheel'

// Une entrée = une destination (tab + subtab). L'ordre est celui de la roue.
// Icône + couleur reprennent le code couleur des Quick Actions historiques.
const DESTINATIONS = [
  { label: 'Chrono',      tab: 'focus',     subtab: 'timer',   color: '#3b82f6', Icon: Timer },
  { label: 'Quêtes',      tab: 'focus',     subtab: 'planner', color: '#f97316', Icon: CalendarDays },
  { label: 'Flashcards',  tab: 'learn',     subtab: 'sr',      color: '#8b5cf6', Icon: BookOpen },
  { label: 'Feynman',     tab: 'learn',     subtab: 'feynman', color: '#ec4899', Icon: NotebookPen },
  { label: 'Progression', tab: 'dashboard', subtab: 'week',    color: '#10b981', Icon: Infinity },
  { label: 'Hauts faits', tab: 'dashboard', subtab: 'badges',  color: '#f59e0b', Icon: Trophy },
]

const WHEEL_ITEMS = DESTINATIONS.map((d) => ({
  label: d.label,
  color: d.color,
  icon: <d.Icon size="1em" strokeWidth={2.25} />,
}))

export default function WheelNav() {
  const mainTab      = useStore((s) => s.mainTab)
  const activeTab    = useStore((s) => s.activeTab)
  const setMainTab   = useStore((s) => s.setMainTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(0)
  const [dark, setDark] = useState(false)

  useScrollLock(open)

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'dark'
    setDark(saved)
    if (saved) document.documentElement.classList.add('dark-mode')
  }, [])

  const toggleTheme = () => {
    haptic.medium()
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark-mode', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const currentIndex = () => {
    const i = DESTINATIONS.findIndex((d) => d.tab === mainTab && d.subtab === activeTab)
    return i >= 0 ? i : 0
  }

  const openWheel = () => {
    haptic.light()
    setSelected(currentIndex())
    setOpen(true)
  }

  const goTo = (index) => {
    haptic.select()
    const dest = DESTINATIONS[index]
    setMainTab(dest.tab)
    setActiveTab(dest.subtab)
    setOpen(false)
  }

  return (
    <>
      {/* ── FAB ─────────────────────────────────────────────────────────────── */}
      <button
        onClick={() => (open ? setOpen(false) : openWheel())}
        className="fixed bottom-8 right-6 z-[60] w-14 h-14 rounded-full shadow-2xl flex items-center justify-center bg-[var(--color-foreground)] transition-transform duration-200 active:scale-90"
        style={{ WebkitTapHighlightColor: 'transparent' }}
        aria-label={open ? 'Fermer la navigation' : 'Ouvrir la navigation'}
      >
        <motion.div animate={{ rotate: open ? 90 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 28 }}>
          {open
            ? <X size={22} strokeWidth={2.5} className="text-[var(--color-background)]" />
            : <Menu size={22} strokeWidth={2} className="text-[var(--color-background)]" />}
        </motion.div>
      </button>

      {/* ── Overlay roue ────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="wheel-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md"
            onClick={() => setOpen(false)}
          >
            {/* Thème — action secondaire discrète (un seul CTA principal : Y aller) */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleTheme() }}
              className="absolute top-[max(1.5rem,env(safe-area-inset-top))] right-6 w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white/70 transition-transform duration-200 active:scale-95"
              aria-label="Changer de thème"
            >
              {dark ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
            </button>

            {/* La roue — ancrée au coin du FAB (speed-dial), pas plein écran.
                Tap sur un item = navigation directe ; scroll/drag = focus. */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92, x: 12, y: 12 }}
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, x: 12, y: 12 }}
              transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              className="absolute bottom-6 right-0 w-[280px] h-[300px]"
              style={{ transformOrigin: 'bottom right' }}
              onClick={(e) => e.stopPropagation()}
            >
              <OptionWheel
                items={WHEEL_ITEMS}
                defaultSelected={selected}
                textColor="#8a8a8a"
                activeColor="#ffffff"
                side="right"
                fontSize={1.5}
                spacing={1.35}
                curve={1.2}
                tilt={10}
                blur={2}
                fade={0.25}
                smoothing={200}
                inset={84}
                loop={false}
                draggable
                onChange={(index) => { setSelected(index); haptic.light() }}
                onItemClick={goTo}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
