import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import useStore from './store/useStore'
import MoodGate from './components/MoodGate'
import Arena from './components/Arena'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from './components/ui/sonner'
import FloatingNav from './components/FloatingNav'

export default function App() {
  const moodLogged = useStore((s) => s.moodLogged)
  const setMood = useStore((s) => s.setMood)

  useEffect(() => {
    // Check if mood was already logged today
    const lastLogged = localStorage.getItem('mile_last_mood_date')
    const today = new Date().toDateString()
    if (lastLogged === today) {
      const score = parseInt(localStorage.getItem('mile_last_mood_score')) || 3
      setMood(score)
    }

    // Enregistrement du Service Worker PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => { })
    }
  }, [setMood])

  return (
    <>
      <ErrorBoundary>
        <AnimatePresence mode="wait">
          {moodLogged ? (
            <motion.div
              key="arena"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            >
              <Arena />
            </motion.div>
          ) : (
            <motion.div
              key="moodgate"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, y: -16 }}
              transition={{ type: 'spring', damping: 26, stiffness: 260 }}
            >
              <MoodGate />
            </motion.div>
          )}
        </AnimatePresence>
      </ErrorBoundary>
      <FloatingNav />
      <Toaster position="bottom-right" />
    </>
  )
}
