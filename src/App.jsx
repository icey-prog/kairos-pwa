import { useEffect } from 'react'
import useStore from './store/useStore'
import MoodGate from './components/MoodGate'
import Arena from './components/Arena'
import { Toaster } from './components/ui/sonner'
import FloatingNav from './components/FloatingNav'

export default function App() {
  const moodLogged = useStore((s) => s.moodLogged)

  useEffect(() => {
    // Enregistrement du Service Worker PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return (
    <>
      {moodLogged ? <Arena /> : <MoodGate />}
      <FloatingNav />
      <Toaster position="bottom-right" />
    </>
  )
}
