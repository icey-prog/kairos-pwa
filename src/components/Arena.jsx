import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react'
import useSWR, { mutate } from 'swr'
import {
  Trophy,
  ChevronRight,
  Zap,
  CheckCircle2,
  ShoppingBag,
  Timer,
  CalendarDays,
  Clock,
  Plus,
  BookOpen,
  NotebookPen,
  Infinity,
} from 'lucide-react'
import useStore from '../store/useStore'
import { API, fetcher, apiFetch } from '../lib/api'
import { isCompleted, getProgress, adaptTask } from '../lib/taskBridge'
import { haptic } from '../lib/haptic'
import LongPress from './LongPress'

const CATEGORY_COLORS = {
  dev:      { bg: 'bg-blue-500/10',   text: 'text-blue-600',   label: 'Dev',   accent: '#3b82f6' },
  learn:    { bg: 'bg-purple-500/10', text: 'text-purple-600', label: 'Learn', accent: '#8b5cf6' },
  health:   { bg: 'bg-orange-500/10', text: 'text-orange-600', label: 'Santé', accent: '#f97316' },
  personal: { bg: 'bg-gray-500/10',   text: 'text-gray-600',   label: 'Perso', accent: '#9ca3af' },
  project:  { bg: 'bg-amber-500/10',  text: 'text-amber-600',  label: 'Projet',accent: '#f59e0b' },
}

const todayStr = () => new Date().toISOString().slice(0, 10)

const InterleavingTimer = lazy(() => import('./InterleavingTimer'))
const DailyPlanner = lazy(() => import('./DailyPlanner'))
const Badges = lazy(() => import('./Badges'))
const WeeklyPlan = lazy(() => import('./WeeklyPlan'))
const SpacedRepetition = lazy(() => import('./SpacedRepetition'))
const FeynmanNotes = lazy(() => import('./FeynmanNotes'))

const SUB_TABS = {
  focus: [
    { id: 'timer',   label: 'Chrono',    icon: Timer },
    { id: 'planner', label: 'Quêtes',    icon: CalendarDays }
  ],
  learn: [
    { id: 'sr',      label: 'Flashcards', icon: BookOpen },
    { id: 'feynman', label: 'Feynman',    icon: NotebookPen }
  ],
  dashboard: [
    { id: 'week',    label: 'Progression',icon: Infinity },
    { id: 'badges',  label: 'Hauts Faits', icon: Trophy }
  ]
}

export default function Arena() {
  const completing = useRef(new Set())
  const [redeeming, setRedeeming] = useState(null)
  const [plannerDefaultDate, setPlannerDefaultDate] = useState(null)

  const currentMood = useStore((s) => s.currentMood)
  const setXpBalance = useStore((s) => s.setXpBalance)
  const setActiveTask = useStore((s) => s.setActiveTask)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const setMainTab = useStore((s) => s.setMainTab)
  const mainTab = useStore((s) => s.mainTab)
  const activeTab = useStore((s) => s.activeTab)

  useEffect(() => {
    const validTabs = SUB_TABS[mainTab]?.map(t => t.id) || []
    if (validTabs.length > 0 && !validTabs.includes(activeTab)) {
      setActiveTab(validTabs[0])
    }
  }, [mainTab, activeTab, setActiveTab])

  const { data: xpData } = useSWR(`${API}/xp/balance`, fetcher, {
    refreshInterval: 4000,
    onSuccess: (data) => setXpBalance(data?.balance ?? 0),
  })
  const { data: rewards } = useSWR(`${API}/rewards`, fetcher)
  const { data: todayTasks = [] } = useSWR(
    `${API}/tasks?date=${todayStr()}`,
    fetcher,
    { refreshInterval: 5000 }
  )

  const xpBalance = xpData?.balance ?? 0
  const isRestricted = currentMood !== null && currentMood <= 2

  const completeTask = async (task) => {
    if (completing.current.has(task.id) || isCompleted(task)) return
    completing.current.add(task.id)
    const remaining = task.target_minutes - task.spent_minutes
    const xpGain = Math.max(10, Math.round(remaining * 0.8))
    try {
      await apiFetch(`${API}/tasks/${task.id}/add_time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: remaining }),
      })
      await apiFetch(`${API}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: xpGain, reason: task.title.slice(0, 100) }),
      })
      haptic.success()
      window.dispatchEvent(new CustomEvent('mile:trophy'))
      mutate(`${API}/tasks?date=${todayStr()}`)
      mutate(`${API}/xp/balance`)
    } catch (err) {
      haptic.error()
      console.error('[completeTask]', err)
    } finally {
      completing.current.delete(task.id)
    }
  }

  // Tap on a quest row = send it to the timer; completion only happens via
  // the timer or an explicit long-press + confirm (no more free-XP tap).
  const focusTask = (task) => {
    haptic.light()
    setActiveTask(adaptTask(task))
    setMainTab('focus')
    setActiveTab('timer')
  }

  const confirmComplete = (task) => {
    if (confirm(`Marquer « ${task.title} » comme terminée ?`)) completeTask(task)
  }

  const redeemReward = async (reward) => {
    if (redeeming || xpBalance < reward.cost) return
    haptic.medium()
    setRedeeming(reward.id)
    try {
      const res = await apiFetch(`${API}/rewards/redeem/${reward.id}`, { method: 'POST' })
      if (res.ok) {
        haptic.success()
        mutate(`${API}/xp/balance`)
      }
    } finally {
      setRedeeming(null)
    }
  }

  const handleSessionComplete = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50, reason: 'Session focus complétée' }),
      })
      if (!res.ok) throw new Error(`XP session failed: ${res.status}`)
      mutate(`${API}/xp/balance`)
    } catch (err) {
      console.error('[handleSessionComplete]', err)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[var(--color-background)] pb-28">

      {/* Navbar */}
      <div className="bg-[var(--color-background)] border-b border-[var(--color-border)] px-5 pt-14 pb-4">
        <div className="max-w-lg mx-auto">

          {/* Title row */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-sm border border-[var(--color-border)] flex-shrink-0">
                <img src="/logo_kaizen.jpg" alt="Neuro-Kaizen Logo" className="w-full h-full object-cover" />
              </div>
              <div>
                <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest">
                  Neuro-Kaizen
                </p>
                <h1 className="text-2xl font-bold text-[var(--color-foreground)] tracking-tight mt-0.5">
                  Arena
                </h1>
              </div>
            </div>

            {/* XP Balance */}
            <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500/10 to-purple-500/10 px-4 py-2.5 rounded-xl">
              <Zap size={13} strokeWidth={2.5} className="text-blue-500" />
              <span className="text-gradient-xp font-bold text-[18px] tabular-nums leading-none">
                {xpBalance.toLocaleString()}
              </span>
              <span className="text-purple-400/70 text-xs font-semibold">XP</span>
            </div>
          </div>

          {/* Segmented Control */}
          <div className="flex gap-1 bg-[var(--color-secondary)] rounded-xl p-1 overflow-x-auto">
            {SUB_TABS[mainTab]?.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg
                  text-xs font-semibold transition-all duration-200 whitespace-nowrap
                  active:scale-[0.97] active:opacity-70
                  ${activeTab === id
                    ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-sm'
                    : 'text-[var(--color-muted-foreground)]'
                  }
                `}
              >
                <Icon size={13} strokeWidth={activeTab === id ? 2.5 : 2} />
                {label}
              </button>
            ))}
          </div>

        </div>
      </div>

      <Suspense fallback={<div className="flex items-center justify-center h-64 text-[var(--color-muted-foreground)]">Chargement...</div>}>
        {/* ── Timer tab ─────────────────────────────────────────────────────── */}
        <div className={activeTab === 'timer' ? '' : 'hidden'}>
          <div className="max-w-lg mx-auto px-5">

            {isRestricted && (
              <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
                <p className="text-xs font-medium text-orange-600">
                  Mode restreint actif — tâches allégées affichées
                </p>
              </div>
            )}

            <div className="bg-[var(--color-secondary)] rounded-2xl mt-4 mb-6">
              <InterleavingTimer onSessionComplete={handleSessionComplete} />
            </div>

            <section className="mb-6">
              <div className="flex items-center justify-between px-1 mb-3">
                <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest">
                  Tâches du jour
                </p>
                <button
                  onClick={() => { setMainTab('focus'); setActiveTab('planner') }}
                  className="flex items-center gap-1 text-[11px] text-[var(--color-primary)] font-medium"
                >
                  <Plus size={12} strokeWidth={2.5} />
                  Ajouter
                </button>
              </div>

              {todayTasks.length === 0 ? (
                <button
                  onClick={() => { setMainTab('focus'); setActiveTab('planner') }}
                  className="w-full flex items-center justify-center gap-2 py-6 rounded-2xl border border-dashed border-[var(--color-border)] text-[13px] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 transition-all"
                >
                  <CalendarDays size={15} strokeWidth={1.75} />
                  Planifie ta journée dans Quêtes
                </button>
              ) : (
                <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                  {todayTasks.map((task, i) => {
                    const done = isCompleted(task)
                    const progress = getProgress(task)
                    const cat = CATEGORY_COLORS[task.category]
                    const xpGain = Math.max(10, Math.round((task.target_minutes - task.spent_minutes) * 0.8))
                    return (
                      <LongPress
                        key={task.id}
                        onTap={() => focusTask(task)}
                        onLongPress={() => confirmComplete(task)}
                        disabled={done}
                        className={`
                          w-full flex items-center gap-4 pl-[17px] pr-5 min-h-[68px] text-left
                          border-l-[3px] transition-all duration-150 active:scale-[0.99] active:opacity-70
                          ${i < todayTasks.length - 1 ? 'border-b border-b-[var(--color-border)]/60' : ''}
                          ${done ? 'cursor-default opacity-60' : 'hover:bg-[var(--color-secondary)]/60'}
                        `}
                        style={{ borderLeftColor: done ? '#10b981' : (cat?.accent ?? 'transparent') }}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-50' : 'bg-[var(--color-secondary)]'}`}>
                          {done
                            ? <CheckCircle2 size={18} strokeWidth={2} className="text-emerald-500" />
                            : <Timer size={18} strokeWidth={1.75} className="text-[var(--color-foreground)]" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={`text-[15px] font-semibold ${done ? 'line-through text-[var(--color-muted-foreground)]' : 'text-[var(--color-foreground)]'}`}>
                              {task.title}
                            </p>
                            {cat && (
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${cat.bg} ${cat.text}`}>
                                {cat.label}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1.5">
                            <div className="flex-1 h-1 bg-[var(--color-secondary)] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-[var(--color-muted-foreground)] flex-shrink-0">
                              <Clock size={10} />
                              <span>{task.spent_minutes}/{task.target_minutes} min</span>
                            </div>
                          </div>
                        </div>
                        {!done && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-sm font-bold text-[var(--color-primary)]">+{xpGain}</span>
                            <ChevronRight size={14} strokeWidth={2} className="text-[var(--color-border)]" />
                          </div>
                        )}
                      </LongPress>
                    )
                  })}
                </div>
              )}
            </section>

            {rewards && rewards.length > 0 && (
              <section className="pb-20">
                <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest px-1 mb-3">
                  Boutique
                </p>
                <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                  {rewards.map((reward, i) => {
                    const canAfford = xpBalance >= reward.cost
                    const isRedeeming = redeeming === reward.id
                    return (
                      <button
                        key={reward.id}
                        onClick={() => redeemReward(reward)}
                        disabled={!canAfford || !!redeeming}
                        className={`
                          w-full flex items-center gap-4 px-5 min-h-[68px] text-left
                          transition-all duration-150 active:scale-[0.99] active:opacity-70
                          ${i < rewards.length - 1 ? 'border-b border-[var(--color-border)]/60' : ''}
                          ${canAfford && !redeeming ? 'hover:bg-[var(--color-secondary)]/60' : 'opacity-50 cursor-default'}
                        `}
                      >
                        <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center flex-shrink-0">
                          <ShoppingBag size={18} strokeWidth={1.75} className="text-[var(--color-primary)]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-[var(--color-foreground)]">{reward.title}</p>
                          <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{reward.cost.toLocaleString()} XP</p>
                        </div>
                        <div className={`
                          px-4 py-2 rounded-xl text-xs font-semibold flex-shrink-0
                          ${isRedeeming ? 'bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]'
                            : canAfford ? 'bg-[var(--color-primary)] text-white'
                            : 'bg-[var(--color-secondary)] text-[var(--color-muted-foreground)]'}
                        `}>
                          {isRedeeming ? '···' : canAfford ? 'Racheter' : 'Insuffisant'}
                        </div>
                      </button>
                    )
                  })}
                </div>
                <div className="flex items-center justify-center gap-2 mt-4">
                  <Trophy size={12} strokeWidth={1.75} className="text-[var(--color-muted-foreground)]" />
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    Solde : <span className="font-semibold text-[var(--color-primary)]">{xpBalance.toLocaleString()} XP</span>
                  </p>
                </div>
              </section>
            )}

          </div>
        </div>

        {/* ── Planner tab ───────────────────────────────────────────────────── */}
        <div className={activeTab === 'planner' ? '' : 'hidden'}>
          <DailyPlanner embedded defaultDate={plannerDefaultDate} />
        </div>

        {/* ── SR tab ────────────────────────────────────────────────────────── */}
        <div className={activeTab === 'sr' ? '' : 'hidden'}>
          <div className="max-w-lg mx-auto pt-4">
            <SpacedRepetition />
          </div>
        </div>

        {/* ── Feynman tab ───────────────────────────────────────────────────── */}
        <div className={activeTab === 'feynman' ? '' : 'hidden'}>
          <div className="max-w-lg mx-auto pt-4">
            <FeynmanNotes />
          </div>
        </div>

        {/* ── Week tab ──────────────────────────────────────────────────────── */}
        <div className={activeTab === 'week' ? '' : 'hidden'}>
          <div className="max-w-2xl mx-auto">
            <WeeklyPlan onAddTask={(dateStr) => {
              setPlannerDefaultDate(dateStr)
              setMainTab('focus')
              setActiveTab('planner')
            }} />
          </div>
        </div>

        {/* ── Badges tab ────────────────────────────────────────────────────── */}
        <div className={activeTab === 'badges' ? '' : 'hidden'}>
          <div className="max-w-lg mx-auto">
            <Badges />
          </div>
        </div>
      </Suspense>

    </div>
  )
}
