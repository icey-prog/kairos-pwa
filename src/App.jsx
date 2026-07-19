import { useEffect, useState } from 'react'
import useStore from './store/useStore'
import MoodGate from './components/MoodGate'
import AuthGate from './components/AuthGate'
import DisciplinePicker from './components/DisciplinePicker'
import Arena from './components/Arena'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import WheelNav from './components/WheelNav'
import PixelBlastBackground from './components/PixelBlastBackground'
import NetworkBanner from './components/NetworkBanner'
import TrophyCelebration from './components/TrophyCelebration'
import { flush } from './lib/offlineQueue'
import { API, apiFetch } from './lib/api'
import { adaptTask } from './lib/taskBridge'
import { getToken } from './lib/auth'
import { moodDateKey, moodScoreKey } from './lib/moodKeys'

export default function App() {
  const moodLogged = useStore((s) => s.moodLogged)
  const setMood = useStore((s) => s.setMood)
  const setActiveTask = useStore((s) => s.setActiveTask)
  const setMainTab = useStore((s) => s.setMainTab)
  const setActiveTab = useStore((s) => s.setActiveTab)

  const [token, setToken] = useState(getToken())
  const [onboarded, setOnboarded] = useState(null) // null = pas encore vérifié

  useEffect(() => {
    if (!token) return
    apiFetch(`${API}/user/disciplines`)
      .then((r) => r.json())
      .then((subs) => setOnboarded(Array.isArray(subs) && subs.length > 0))
      .catch(() => setOnboarded(true)) // hors ligne : ne pas bloquer sur l'onboarding
  }, [token])

  // Focus a task by id: fetch tasks list, find it, activate it, navigate
  const focusTaskById = async (taskId) => {
    try {
      const tasks = await apiFetch(`${API}/tasks`).then((r) => r.json())
      const found = tasks.find((t) => String(t.id) === String(taskId))
      if (found) {
        setActiveTask(adaptTask(found))
        setMainTab('focus')
        setActiveTab('timer')
      }
    } catch (_) {}
  }

  useEffect(() => {
    if (!token) return
    // Check if mood was already logged today
    const lastLogged = localStorage.getItem(moodDateKey())
    const today = new Date().toDateString()
    if (lastLogged === today) {
      const score = parseInt(localStorage.getItem(moodScoreKey())) || 3
      setMood(score)
    }

    // Handle ?focus=taskId in URL (app opened via notification when it was closed)
    const params = new URLSearchParams(window.location.search)
    const focusId = params.get('focus')
    if (focusId) {
      window.history.replaceState({}, '', window.location.pathname)
      focusTaskById(focusId)
    }

    // Register SW + listen for FOCUS_TASK messages from notificationclick
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const next = reg.installing
          next?.addEventListener('statechange', () => {
            if (next.state === 'installed' && navigator.serviceWorker.controller) {
              toast.info('Mise à jour disponible', {
                description: 'Recharge la page pour appliquer.',
                action: { label: 'Recharger', onClick: () => window.location.reload() },
                duration: 12000,
              })
            }
          })
        })
      }).catch(() => {})

      const handler = (event) => {
        if (event.data?.type === 'FOCUS_TASK' && event.data.taskId) {
          focusTaskById(event.data.taskId)
        }
      }
      navigator.serviceWorker.addEventListener('message', handler)
      return () => navigator.serviceWorker.removeEventListener('message', handler)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setMood, token])

  // Drain the offline queue on every app start (connection may have returned while closed)
  useEffect(() => { flush() }, [])

  let screen
  if (!token) {
    screen = <AuthGate onSignedUp={() => setToken(getToken())} />
  } else if (onboarded === null) {
    screen = null // vérification en cours — évite un flash MoodGate/Picker
  } else if (!onboarded) {
    screen = <DisciplinePicker onDone={() => setOnboarded(true)} />
  } else {
    screen = (
      <>
        <NetworkBanner />
        <ErrorBoundary>
          {moodLogged ? <Arena /> : <MoodGate />}
        </ErrorBoundary>
        <WheelNav />
        <TrophyCelebration />
        <Toaster position="bottom-right" />
      </>
    )
  }

  return (
    <>
      <PixelBlastBackground />
      {screen}
    </>
  )
}
