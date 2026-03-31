import useSWR, { mutate } from 'swr'
import { useState, useCallback } from 'react'
import {
  Brain,
  BookOpen,
  Pencil,
  Target,
  Trophy,
  ChevronRight,
  Zap,
  CheckCircle2,
  ShoppingBag,
  Timer,
  CalendarDays,
} from 'lucide-react'
import useStore from '../store/useStore'
import InterleavingTimer from './InterleavingTimer'
import DailyPlanner from './DailyPlanner'
import { API, fetcher } from '../lib/api'

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

const TABS = [
  { id: 'timer', label: 'Timer', icon: Timer },
  { id: 'planner', label: 'Planner', icon: CalendarDays },
]

export default function Arena() {
  const [completed, setCompleted] = useState(new Set())
  const [redeeming, setRedeeming] = useState(null)
  const currentMood = useStore((s) => s.currentMood)
  const setXpBalance = useStore((s) => s.setXpBalance)
  const activeTab = useStore((s) => s.activeTab)
  const setActiveTab = useStore((s) => s.setActiveTab)

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
      await fetch(`${API}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: task.xp, reason: task.title }),
      })
      mutate(`${API}/xp/balance`)
    } catch (_) {}
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

  // Award XP when a focus session completes in the timer
  const handleSessionComplete = useCallback(async () => {
    try {
      await fetch(`${API}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 50, reason: 'Session focus complétée' }),
      })
      mutate(`${API}/xp/balance`)
    } catch (_) {}
  }, [])

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <div className="bg-white border-b border-gray-100 px-5 pt-14 pb-4">
        <div className="max-w-lg mx-auto">

          {/* Title row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-widest">
                Neuro-Kaizen
              </p>
              <h1 className="text-2xl font-bold text-[#111111] tracking-tight mt-0.5">
                Arena
              </h1>
            </div>

            {/* XP Balance */}
            <div className="flex items-center gap-1.5 bg-[#007AFF]/10 px-4 py-2.5 rounded-xl">
              <Zap size={13} className="text-[#007AFF]" strokeWidth={2.5} fill="#007AFF" />
              <span className="text-[#007AFF] font-bold text-[18px] tabular-nums leading-none">
                {xpBalance.toLocaleString()}
              </span>
              <span className="text-[#007AFF]/60 text-xs font-semibold">XP</span>
            </div>
          </div>

          {/* Segmented Control */}
          <div className="flex gap-1 bg-[#F7F7F5] rounded-xl p-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 rounded-lg
                  text-sm font-semibold transition-all duration-200
                  active:scale-[0.97] active:opacity-70
                  ${activeTab === id
                    ? 'bg-white text-[#111111] shadow-sm'
                    : 'text-[#8E8E93]'
                  }
                `}
              >
                <Icon size={14} strokeWidth={activeTab === id ? 2.5 : 2} />
                {label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* Views — both mounted, inactive is hidden to preserve timer state */}

      {/* Timer tab */}
      <div className={activeTab === 'timer' ? '' : 'hidden'}>
        <div className="max-w-lg mx-auto px-5">

          {/* Mood restriction banner */}
          {isRestricted && (
            <div className="mt-4 bg-orange-50 border border-orange-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-400 flex-shrink-0" />
              <p className="text-xs font-medium text-orange-600">
                Mode restreint actif — tâches allégées affichées
              </p>
            </div>
          )}

          {/* Timer */}
          <div className="bg-[#F7F7F5] rounded-2xl mt-4 mb-6">
            <InterleavingTimer onSessionComplete={handleSessionComplete} />
          </div>

          {/* XP Tasks */}
          <section className="mb-6">
            <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-widest px-1 mb-3">
              Protocole du jour
            </p>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
                      ${i < tasks.length - 1 ? 'border-b border-gray-50' : ''}
                      ${isDone ? 'opacity-50 cursor-default' : 'hover:bg-gray-50/60'}
                    `}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isDone ? 'bg-green-50' : 'bg-[#F7F7F5]'}`}>
                      {isDone
                        ? <CheckCircle2 size={18} strokeWidth={2} className="text-green-500" />
                        : <Icon size={18} strokeWidth={1.75} className="text-[#111111]" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-[15px] font-semibold ${isDone ? 'line-through text-[#8E8E93]' : 'text-[#111111]'}`}>
                          {task.title}
                        </p>
                        <span className="text-[10px] font-semibold text-[#8E8E93] bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wide">
                          {task.tag}
                        </span>
                      </div>
                      <p className="text-xs text-[#8E8E93] mt-0.5 truncate">{task.description}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="text-sm font-bold text-[#007AFF]">+{task.xp}</span>
                      <ChevronRight size={14} strokeWidth={2} className="text-gray-300" />
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Rewards */}
          {rewards && rewards.length > 0 && (
            <section className="pb-20">
              <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-widest px-1 mb-3">
                Boutique
              </p>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
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
                        ${i < rewards.length - 1 ? 'border-b border-gray-50' : ''}
                        ${canAfford && !redeeming ? 'hover:bg-gray-50/60' : 'opacity-50 cursor-default'}
                      `}
                    >
                      <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag size={18} strokeWidth={1.75} className="text-[#007AFF]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[15px] font-semibold text-[#111111]">{reward.title}</p>
                        <p className="text-xs text-[#8E8E93] mt-0.5">{reward.cost.toLocaleString()} XP</p>
                      </div>
                      <div className={`
                        px-4 py-2 rounded-xl text-xs font-semibold flex-shrink-0
                        ${isRedeeming ? 'bg-gray-100 text-gray-400'
                          : canAfford ? 'bg-[#007AFF] text-white'
                          : 'bg-gray-100 text-[#8E8E93]'}
                      `}>
                        {isRedeeming ? '···' : canAfford ? 'Racheter' : 'Insuffisant'}
                      </div>
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-center gap-2 mt-4">
                <Trophy size={12} strokeWidth={1.75} className="text-[#8E8E93]" />
                <p className="text-xs text-[#8E8E93]">
                  Solde : <span className="font-semibold text-[#007AFF]">{xpBalance.toLocaleString()} XP</span>
                </p>
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Planner tab — mounted but hidden when inactive, preserving timer state */}
      <div className={activeTab === 'planner' ? '' : 'hidden'}>
        <DailyPlanner embedded />
      </div>

    </div>
  )
}
