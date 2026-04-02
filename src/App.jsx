import { useEffect } from 'react'
import useStore from './store/useStore'
import MoodGate from './components/MoodGate'
import Arena from './components/Arena'
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
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [setMood])

  return (
    <>
      {moodLogged ? <Arena /> : <MoodGate />}
      <FloatingNav />
      <Toaster position="bottom-right" />
    </>
  )
}
