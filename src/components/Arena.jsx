import { lazy, Suspense, useState, useCallback, useEffect } from 'react'
import useSWR, { mutate } from 'swr'
import {
  Brain,
  BookOpen,
  Pencil,
  Target,
  Trophy,
  ChevronRight,
  Zap,
  CheckCircle2,
  TrendingUp,
  ShoppingBag,
  Timer,
  CalendarDays,
} from 'lucide-react'
import useStore from '../store/useStore'
import { API, fetcher } from '../lib/api'
import ThemeToggle from './ThemeToggle'

const InterleavingTimer = lazy(() => import('./InterleavingTimer'))
const DailyPlanner = lazy(() => import('./DailyPlanner'))
const Badges = lazy(() => import('./Badges'))
const WeeklyPlan = lazy(() => import('./WeeklyPlan'))
const SpacedRepetition = lazy(() => import('./SpacedRepetition'))
const FeynmanNotes = lazy(() => import('./FeynmanNotes'))

const ALL_TASKS = [
  {
    id: 'feynman',
    icon: Pencil,
    title: 'Méthode Feynman',
    description: 'Expliquer un concept comme à un enfant',
    xp: 50,
    tag: 'Rappel profond',
    minMood: 1,
  },
  {
    id: 'recall',
    icon: Brain,
    title: 'Rappel Actif',
    description: '20 min de révision sans notes',
    xp: 40,
    tag: 'Mémoire',
    minMood: 1,
  },
  {
    id: 'design',
    icon: Target,
    title: 'Sprint UI/UX',
    description: 'Reproduire un composant Exxolab',
    xp: 60,
    tag: 'Design',
    minMood: 3,
  },
  {
    id: 'code',
    icon: BookOpen,
    title: 'Code Review',
    description: 'Analyser et refactoriser 1 fichier',
    xp: 45,
    tag: 'Code',
    minMood: 3,
  },
]

const SUB_TABS = {
  focus: [
    { id: 'timer',   label: 'Chrono',    icon: Timer },
    { id: 'planner', label: 'Quêtes',    icon: CalendarDays }
  ],
  learn: [
    { id: 'sr',      label: 'Flashcards', icon: BookOpen },
    { id: 'feynman', label: 'Feynman',    icon: Pencil }
  ],
  dashboard: [
    { id: 'week',    label: 'Progression',icon: TrendingUp },
    { id: 'badges',  label: 'Hauts Faits', icon: Trophy }
  ]
}

export default function Arena() {
  const [completed, setCompleted] = useState(new Set())
  const [redeeming, setRedeeming] = useState(null)
  
  const currentMood = useStore((s) => s.currentMood)
  const setXpBalance = useStore((s) => s.setXpBalance)
  
  const mainTab = useStore((s) => s.mainTab)
  const activeTab = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)

  useEffect(() => {
    const validTabs = SUB_TABS[mainTab]?.map(t => t.id) || [];
    if (validTabs.length > 0 && !validTabs.includes(activeTab)) {
      setActiveTab(validTabs[0]);
    }
  }, [mainTab, activeTab, setActiveTab])

  const { data: xpData } = useSWR(`${API}/xp/balance`, fetcher, {
    refreshInterval: 4000,
    onSuccess: (data) => setXpBalance(data?.balance ?? 0),
  })
  const { data: rewards } = useSWR(`${API}/rewards`, fetcher)

  const xpBalance = xpData?.balance ?? 0
  const tasks = ALL_TASKS.filter((t) => t.minMood <= (currentMood ?? 5))
  const isRestricted = currentMood !== null && currentMood <= 2

  const grantXP = async (task) => {
    if (completed.has(task.id)) return
    setCompleted((prev) => new Set([...prev, task.id]))
    try {
      const res = await fetch(`${API}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: task.xp, reason: task.title.slice(0, 100) }),
      })
      if (!res.ok) throw new Error(`XP grant failed: ${res.status}`)
      mutate(`${API}/xp/balance`)
    } catch (err) {
      console.error('[grantXP]', err)
      setCompleted((prev) => { const s = new Set(prev); s.delete(task.id); return s })
    }
  }

  const redeemReward = async (reward) => {
    if (redeeming || xpBalance < reward.cost) return
    setRedeeming(reward.id)
    try {
      const res = await fetch(`${API}/rewards/redeem/${reward.id}`, { method: 'POST' })
      if (res.ok) mutate(`${API}/xp/balance`)
    } finally {
      setRedeeming(null)
    }
  }

  const handleSessionComplete = useCallback(async () => {
    try {
      const res = await fetch(`${API}/xp`, {
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
    <div className="min-h-screen bg-[var(--color-background)]">

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
            <div className="flex items-center gap-1.5 bg-[var(--color-primary)]/10 px-4 py-2.5 rounded-xl">
              <Zap size={13} className="text-[var(--color-primary)]" strokeWidth={2.5} />
              <span className="text-[var(--color-primary)] font-bold text-[18px] tabular-nums leading-none">
                {xpBalance.toLocaleString()}
              </span>
              <span className="text-[var(--color-primary)]/60 text-xs font-semibold">XP</span>
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
              <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)] uppercase tracking-widest px-1 mb-3">
                Protocole du jour
              </p>
              <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
                {tasks.map((task, i) => {
                  const Icon = task.icon
                  const isDone = completed.has(task.id)
                  return (
                    <button
                      key={task.id}
                      onClick={() => grantXP(task)}
                      disabled={isDone}
                      className={`
                        w-full flex items-center gap-4 px-5 min-h-[68px] text-left
                        transition-all duration-150 active:scale-[0.99] active:opacity-70
                        ${i < tasks.length - 1 ? 'border-b border-[var(--color-border)]/60' : ''}
                        ${isDone ? 'opacity-50 cursor-default' : 'hover:bg-[var(--color-secondary)]/60'}
                      `}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-50' : 'bg-[var(--color-secondary)]'}`}>
                        {isDone
                          ? <CheckCircle2 size={18} strokeWidth={2} className="text-green-500" />
                          : <Icon size={18} strokeWidth={1.75} className="text-[var(--color-foreground)]" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`text-[15px] font-semibold ${isDone ? 'line-through text-[var(--color-muted-foreground)]' : 'text-[var(--color-foreground)]'}`}>
                            {task.title}
                          </p>
                          <span className="text-[10px] font-semibold text-[var(--color-muted-foreground)] bg-[var(--color-secondary)] px-2 py-0.5 rounded-full uppercase tracking-wide">
                            {task.tag}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5 truncate">{task.description}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <span className="text-sm font-bold text-[var(--color-primary)]">+{task.xp}</span>
                        <ChevronRight size={14} strokeWidth={2} className="text-[var(--color-border)]" />
                      </div>
                    </button>
                  )
                })}
              </div>
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
          <DailyPlanner embedded />
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
            <WeeklyPlan />
          </div>
        </div>

        {/* ── Badges tab ────────────────────────────────────────────────────── */}
        <div className={activeTab === 'badges' ? '' : 'hidden'}>
          <div className="max-w-lg mx-auto">
            <Badges />
          </div>
        </div>
      </Suspense>

      {/* Theme toggle — fixed bottom right */}
      <ThemeToggle />

    </div>
  )
}
