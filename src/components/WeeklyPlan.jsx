import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, ChevronLeft, ChevronRight, Clock,
  CheckCircle2, TrendingUp, Plus,
} from 'lucide-react'
import { format, addWeeks, subWeeks, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from 'date-fns'
import { fr } from 'date-fns/locale'
import useSWR, { mutate } from 'swr'
import { Card, CardContent, Button } from '../lib/ui'
import { cn } from '../lib/utils'
import { API, fetcher, apiFetch } from '../lib/api'
import { isCompleted, getProgress, adaptTask } from '../lib/taskBridge'
import useStore from '../store/useStore'
import LongPress from './LongPress'

const CATEGORY_DOT = {
  dev:      'bg-blue-400',
  learn:    'bg-purple-400',
  health:   'bg-orange-400',
  personal: 'bg-gray-400',
  project:  'bg-amber-400',
}

function getCategoryDot(task) {
  if (task.category && CATEGORY_DOT[task.category]) return CATEGORY_DOT[task.category]
  const t = task.title.toLowerCase()
  if (t.includes('code') || t.includes('dev') || t.includes('bug')) return 'bg-blue-400'
  if (t.includes('sport') || t.includes('cardio') || t.includes('gym')) return 'bg-orange-400'
  if (t.includes('review') || t.includes('read') || t.includes('learn')) return 'bg-purple-400'
  return 'bg-[var(--color-primary)]'
}

export default function WeeklyPlan({ onAddTask }) {
  const completing = useRef(new Set()) // double-submit guard
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const setActiveTab = useStore((s) => s.setActiveTab)
  const setMainTab = useStore((s) => s.setMainTab)
  const setActiveTask = useStore((s) => s.setActiveTask)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

  const { data: tasks = [] } = useSWR(`${API}/tasks`, fetcher, { refreshInterval: 5000 })

  // Mark a task complete by adding the remaining minutes via the existing endpoint
  const completeTask = async (task) => {
    if (completing.current.has(task.id)) return
    completing.current.add(task.id)
    if (isCompleted(task)) return
    const remaining = task.target_minutes - task.spent_minutes
    if (remaining <= 0) return
    try {
      const r1 = await apiFetch(`${API}/tasks/${task.id}/add_time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: remaining }),
      })
      if (!r1.ok) throw new Error(`add_time failed: ${r1.status}`)

      const r2 = await apiFetch(`${API}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 15, reason: task.title.slice(0, 100) }),
      })
      if (!r2.ok) throw new Error(`xp grant failed: ${r2.status}`)

      window.dispatchEvent(new CustomEvent('mile:trophy'))
      mutate(`${API}/tasks`)
      mutate(`${API}/xp/balance`)
    } catch (err) {
      console.error('[completeTask]', err)
    } finally {
      completing.current.delete(task.id)
    }
  }

  const focusTask = (task) => {
    setActiveTask(adaptTask(task))
    setMainTab('focus')
    setActiveTab('timer')
  }

  const tasksByDay = weekDays.map((day) => ({
    date: day,
    dayName: format(day, 'EEE', { locale: fr }),
    dayNumber: format(day, 'd'),
    month: format(day, 'MMM', { locale: fr }),
    isToday: isSameDay(day, new Date()),
    dateStr: format(day, 'yyyy-MM-dd'),
    tasks: tasks.filter((t) => {
      const d = t.scheduled_date
        ? new Date(t.scheduled_date + 'T00:00:00')
        : t.created_at ? new Date(t.created_at) : null
      return d ? isSameDay(d, day) : false
    }),
  }))

  const completedCount = tasks.filter(isCompleted).length
  const weekProgress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0
  const totalMinutes = tasks.reduce((a, t) => a + (t.target_minutes ?? 0), 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 px-5 py-4 pb-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">Plan Hebdo</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">Vue d'ensemble de la semaine</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(subWeeks(currentWeek, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div className="glass px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--color-foreground)] min-w-[130px] text-center">
            {format(weekStart, 'd MMM', { locale: fr })} – {format(weekEnd, 'd MMM', { locale: fr })}
          </div>
          <Button variant="outline" size="icon" onClick={() => setCurrentWeek(addWeeks(currentWeek, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Tâches totales', value: tasks.length,        Icon: Calendar,     color: 'text-blue-400',    bg: 'bg-blue-500/20' },
          { label: 'Complétées',     value: completedCount,       Icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { label: 'Progression',    value: `${weekProgress.toFixed(0)}%`, Icon: TrendingUp,  color: 'text-amber-400',   bg: 'bg-amber-500/20' },
          { label: 'Durée prévue',   value: `${(totalMinutes / 60).toFixed(1)}h`, Icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/20' },
        ].map(({ label, value, Icon, color, bg }) => (
          <Card key={label} className="glass border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--color-foreground)]">{value}</p>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Progress bar */}
      <div className="glass rounded-xl p-4">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-[var(--color-muted-foreground)]">Progression globale</span>
          <span className="font-medium text-[var(--color-foreground)]">{completedCount} / {tasks.length}</span>
        </div>
        <div className="h-3 bg-[var(--color-secondary)] rounded-full overflow-hidden">
          <motion.div
            className="h-full gradient-xp"
            initial={{ width: 0 }}
            animate={{ width: `${weekProgress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Weekly calendar */}
      <div className="grid grid-cols-1 sm:grid-cols-7 gap-3">
        {tasksByDay.map((day) => (
          <motion.div
            key={day.dayName}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'glass rounded-xl overflow-hidden',
              day.isToday && 'ring-2 ring-[var(--color-primary)]',
            )}
          >
            {/* Day header */}
            <div className={cn(
              'p-2 text-center border-b border-[var(--color-border)]/50',
              day.isToday && 'bg-[var(--color-primary)]/10',
            )}>
              <p className="text-[10px] text-[var(--color-muted-foreground)] uppercase tracking-wider">{day.dayName}</p>
              <p className={cn('text-lg font-bold', day.isToday ? 'text-[var(--color-primary)]' : 'text-[var(--color-foreground)]')}>
                {day.dayNumber}
              </p>
              <p className="text-[9px] text-[var(--color-muted-foreground)]">{day.month}</p>
            </div>

            {/* Tasks */}
            <div className="p-2 space-y-1.5 min-h-[120px]">
              {day.tasks.length === 0 && (
                <div className="text-center py-4">
                  <p className="text-[10px] text-[var(--color-muted-foreground)]">Repos</p>
                </div>
              )}
              {day.tasks.map((task) => {
                  const done = isCompleted(task)
                  const progress = getProgress(task)
                  return (
                    <LongPress
                      key={task.id}
                      onTap={() => focusTask(task)}
                      onLongPress={() => { if (confirm(`Marquer « ${task.title} » comme terminée ?`)) completeTask(task) }}
                      disabled={done}
                      className={cn(
                        'w-full text-left p-2 rounded-lg text-[11px] cursor-pointer transition-all',
                        done
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-[var(--color-secondary)]/50 border border-[var(--color-border)]/30 hover:bg-[var(--color-secondary)]',
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", getCategoryDot(task))} />
                        <p className={cn('font-medium truncate text-[var(--color-foreground)]', done && 'line-through opacity-60')}>
                          {task.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 mt-1 pl-4">
                        <Clock className="w-2.5 h-2.5 text-[var(--color-muted-foreground)]" />
                        <span className="text-[9px] text-[var(--color-muted-foreground)]">{task.target_minutes}min</span>
                        {!done && (
                          <span className="ml-auto text-[9px] text-[var(--color-primary)]">{progress}%</span>
                        )}
                        {done && (
                          <CheckCircle2 className="ml-auto w-3 h-3 text-emerald-400" />
                        )}
                      </div>
                    </LongPress>
                  )
                })}
              <button
                onClick={() => {
                  if (onAddTask) {
                    onAddTask(day.dateStr)
                  } else {
                    setActiveTab('planner')
                  }
                }}
                className="w-full mt-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] text-[var(--color-muted-foreground)] hover:text-[var(--color-primary)] hover:bg-[var(--color-primary)]/5 transition-all"
              >
                <Plus className="w-3 h-3" />
                Tâche
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <p className="text-xs text-center text-[var(--color-muted-foreground)]">
        Clique sur une tâche pour la marquer comme complétée
      </p>
    </motion.div>
  )
}
