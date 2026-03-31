import { useEffect } from 'react'
import useStore from '../store/useStore'
import MoodGate from '../components/MoodGate'
import Arena from '../components/Arena'

export default function Home() {
  const moodLogged = useStore((s) => s.moodLogged)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return moodLogged ? <Arena /> : <MoodGate />
}
