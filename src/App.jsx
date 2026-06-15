import { useEffect } from 'react'
import useStore from './store/useStore'
import MoodGate from './components/MoodGate'
import Arena from './components/Arena'
import ErrorBoundary from './components/ErrorBoundary'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'
import FloatingNav from './components/FloatingNav'
import { API, apiFetch } from './lib/api'
import { adaptTask } from './lib/taskBridge'

export default function App() {
  const moodLogged = useStore((s) => s.moodLogged)
  const setMood = useStore((s) => s.setMood)
  const setActiveTask = useStore((s) => s.setActiveTask)
  const setMainTab = useStore((s) => s.setMainTab)
  const setActiveTab = useStore((s) => s.setActiveTab)

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
    // Check if mood was already logged today
    const lastLogged = localStorage.getItem('mile_last_mood_date')
    const today = new Date().toDateString()
    if (lastLogged === today) {
      const score = parseInt(localStorage.getItem('mile_last_mood_score')) || 3
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
  }, [setMood])

  return (
    <>
      <ErrorBoundary>
        {moodLogged ? <Arena /> : <MoodGate />}
      </ErrorBoundary>
      <FloatingNav />
      <Toaster position="bottom-right" />
    </>
  )
}
