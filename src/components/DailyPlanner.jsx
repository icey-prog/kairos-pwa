import { useState, useEffect, useRef } from 'react'
import useSWR, { mutate } from 'swr'
import { Plus, Link, ExternalLink, X, Bell, Play, Calendar } from 'lucide-react'
import { format, addDays } from 'date-fns'
import { fr } from 'date-fns/locale'
import useStore from '../store/useStore'
import { API, fetcher } from '../lib/api'

const isUrl = (str) => str.startsWith('http://') || str.startsWith('https://')

const CATEGORIES = [
  { id: 'dev',      label: 'Dev',     color: 'bg-blue-500/15 text-blue-600 border-blue-500/30' },
  { id: 'learn',    label: 'Learn',   color: 'bg-purple-500/15 text-purple-600 border-purple-500/30' },
  { id: 'health',   label: 'Santé',   color: 'bg-orange-500/15 text-orange-600 border-orange-500/30' },
  { id: 'personal', label: 'Perso',   color: 'bg-gray-500/15 text-gray-600 border-gray-500/30' },
  { id: 'project',  label: 'Projet',  color: 'bg-amber-500/15 text-amber-600 border-amber-500/30' },
]

const todayStr  = () => format(new Date(), 'yyyy-MM-dd')
const tomorrowStr = () => format(addDays(new Date(), 1), 'yyyy-MM-dd')

function scheduleSwNotification(task) {
  if (!task.reminder_time || !('serviceWorker' in navigator)) return
  navigator.serviceWorker.ready.then((reg) => {
    reg.active?.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      taskId: task.id,
      title: task.title,
      reminderTime: task.reminder_time,
    })
  }).catch(() => {})
}

function useNotifications(tasks) {
  useEffect(() => {
    if (!('Notification' in window)) return
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  useEffect(() => {
    if (!tasks || !('Notification' in window) || Notification.permission !== 'granted') return

    const timers = tasks
      .filter((t) => t.reminder_time)
      .flatMap((t) => {
        const delay = new Date(t.reminder_time).getTime() - Date.now()
        if (delay <= 0) return []
        return [
          setTimeout(() => {
            new Notification(`⏰ ${t.title}`, {
              body: `Il est temps de travailler sur "${t.title}"`,
              icon: '/logo_kaizen.jpg',
            })
          }, delay),
        ]
      })

    return () => timers.forEach(clearTimeout)
  }, [tasks])
}

export default function DailyPlanner({ embedded = false, defaultDate = null }) {
  const [title, setTitle] = useState('')
  const [targetMinutes, setTargetMinutes] = useState(90)
  const [category, setCategory] = useState(null)
  const [scheduledDate, setScheduledDate] = useState(defaultDate || todayStr())
  const [newResources, setNewResources] = useState([])
  const [urlInput, setUrlInput] = useState('')
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [showReminder, setShowReminder] = useState(false)
  const [reminderTime, setReminderTime] = useState('')
  const [clipboardUrl, setClipboardUrl] = useState(null)

  const setActiveTask = useStore((s) => s.setActiveTask)
  const setActiveTab = useStore((s) => s.setActiveTab)

  const urlRef = useRef(null)

  const { data: tasks } = useSWR(`${API}/tasks`, fetcher, { refreshInterval: 6000 })
  const { data: completed } = useSWR(`${API}/tasks/completed`, fetcher)

  useNotifications(tasks)

  const toggleUrlInput = async () => {
    const opening = !showUrlInput
    setShowUrlInput(opening)
    if (opening) {
      try {
        const text = await navigator.clipboard.readText()
        setClipboardUrl(isUrl(text.trim()) ? text.trim() : null)
      } catch (_) {
        setClipboardUrl(null)
      }
      setTimeout(() => urlRef.current?.focus(), 50)
    } else {
      setClipboardUrl(null)
    }
  }

  const acceptClipboardUrl = () => {
    if (!clipboardUrl) return
    setNewResources((prev) => [...prev, clipboardUrl])
    setClipboardUrl(null)
  }

  const handleUrlKeyDown = (e) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    const val = urlInput.trim()
    if (!val) return
    setNewResources((prev) => [...prev, val])
    setUrlInput('')
    setClipboardUrl(null)
  }

  const removeResource = (index) => {
    setNewResources((prev) => prev.filter((_, i) => i !== index))
  }

  const submitTask = async () => {
    if (!title.trim()) return
    const payload = {
      title: title.trim(),
      target_minutes: targetMinutes,
      resources: newResources.length ? JSON.stringify(newResources) : null,
      reminder_time: reminderTime || null,
      category: category || null,
      scheduled_date: scheduledDate || todayStr(),
    }
    try {
      const res = await fetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        const task = await res.json()
        scheduleSwNotification(task)
      }
      mutate(`${API}/tasks`)
    } catch (_) {}
    setTitle('')
    setTargetMinutes(90)
    setCategory(null)
    setScheduledDate(todayStr())
    setNewResources([])
    setUrlInput('')
    setReminderTime('')
    setShowUrlInput(false)
    setShowReminder(false)
    setClipboardUrl(null)
  }

  const focusTask = (task) => {
    setActiveTask(task)
    setActiveTab('timer')
  }

  return (
    <div className={`bg-white px-5 max-w-lg mx-auto ${embedded ? 'pt-6 pb-20' : 'min-h-screen py-12'}`}>

      {!embedded && (
        <div className="mb-8">
          <p className="text-xs font-semibold text-[#8E8E93] uppercase tracking-widest mb-1">
            Daily Planner
          </p>
          <h1 className="text-2xl font-bold text-[#111111] tracking-tight">Aujourd'hui</h1>
        </div>
      )}

      {/* Add Task Form */}
      <div className="bg-[#F7F7F5] rounded-2xl px-5 py-4 mb-6">

        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submitTask()}
          placeholder="Nouvelle tâche…"
          className="w-full bg-transparent text-lg font-medium text-[#111111] placeholder-[#C7C7CC] outline-none"
        />

        {/* Category pills */}
        <div className="flex items-center gap-1.5 mt-3 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(category === cat.id ? null : cat.id)}
              className={`
                px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all
                ${category === cat.id ? cat.color : 'bg-white border-gray-100 text-[#8E8E93]'}
              `}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Scheduled date row */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-[11px] text-[#8E8E93] font-medium">Planifié</span>
          <button
            onClick={() => setScheduledDate(todayStr())}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${scheduledDate === todayStr() ? 'bg-[#007AFF] text-white' : 'bg-white text-[#8E8E93] border border-gray-100'}`}
          >
            Aujourd'hui
          </button>
          <button
            onClick={() => setScheduledDate(tomorrowStr())}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${scheduledDate === tomorrowStr() ? 'bg-[#007AFF] text-white' : 'bg-white text-[#8E8E93] border border-gray-100'}`}
          >
            Demain
          </button>
          <div className="relative flex items-center">
            <Calendar size={12} className="absolute left-2 text-[#8E8E93] pointer-events-none" />
            <input
              type="date"
              value={scheduledDate}
              min={todayStr()}
              onChange={(e) => setScheduledDate(e.target.value)}
              className={`pl-6 pr-2 py-1 rounded-lg text-[11px] font-medium border outline-none transition-colors cursor-pointer
                ${scheduledDate !== todayStr() && scheduledDate !== tomorrowStr()
                  ? 'bg-[#007AFF] text-white border-[#007AFF]'
                  : 'bg-white text-[#8E8E93] border-gray-100'}`}
            />
          </div>
        </div>

        {/* target_minutes + reminder row */}
        <div className="flex items-center gap-3 mt-3 border-t border-gray-200 pt-3">
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min={1}
              value={targetMinutes}
              onChange={(e) => setTargetMinutes(Math.max(1, Number(e.target.value)))}
              className="w-14 bg-white border border-gray-100 rounded-lg text-sm text-[#111111] font-medium text-center outline-none py-1 tabular-nums"
            />
            <span className="text-xs text-[#8E8E93]">min</span>
          </div>

          {/* Reminder toggle */}
          <button
            onClick={() => setShowReminder((v) => !v)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
              active:scale-[0.96] active:opacity-70
              ${showReminder ? 'bg-orange-50 text-orange-500' : 'bg-white text-[#8E8E93] border border-gray-100'}
            `}
          >
            <Bell size={12} strokeWidth={2} />
            Rappel
          </button>

          {showReminder && (
            <input
              type="datetime-local"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[#8E8E93] outline-none"
            />
          )}
        </div>

        {/* Resource pills */}
        {newResources.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {newResources.map((url, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs bg-white text-[#8E8E93] border border-gray-100 rounded-md px-2.5 py-1 max-w-[220px]"
              >
                <Link size={10} strokeWidth={2} className="flex-shrink-0" />
                <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
                <button onClick={() => removeResource(i)} className="flex-shrink-0 hover:text-[#111111] active:opacity-70">
                  <X size={10} strokeWidth={2.5} />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* URL input section */}
        {showUrlInput && (
          <div className="mt-3 border-t border-gray-200 pt-3 space-y-2">
            {clipboardUrl && (
              <button
                onClick={acceptClipboardUrl}
                className="w-full flex items-center gap-2.5 px-3 py-2 bg-[#007AFF]/8 rounded-xl text-left transition-all active:scale-[0.98] active:opacity-70"
              >
                <div className="w-6 h-6 rounded-md bg-[#007AFF]/15 flex items-center justify-center flex-shrink-0">
                  <Link size={12} strokeWidth={2} className="text-[#007AFF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#007AFF]">Coller le lien copié</p>
                  <p className="text-[11px] text-[#007AFF]/60 truncate mt-0.5">{clipboardUrl}</p>
                </div>
                <span className="text-[10px] font-semibold text-[#007AFF]/50 flex-shrink-0">Tap</span>
              </button>
            )}
            <input
              ref={urlRef}
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={handleUrlKeyDown}
              placeholder="Ou coller une URL manuellement…"
              className="w-full bg-transparent text-sm text-[#8E8E93] placeholder-[#C7C7CC] outline-none"
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={toggleUrlInput}
            className={`
              w-8 h-8 rounded-lg flex items-center justify-center transition-colors
              active:scale-[0.96] active:opacity-70
              ${showUrlInput ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'text-[#8E8E93] hover:text-[#111111]'}
            `}
          >
            <Link size={16} strokeWidth={2} />
          </button>

          <button
            onClick={submitTask}
            disabled={!title.trim()}
            className={`
              flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold
              transition-all active:scale-[0.97] active:opacity-70
              ${title.trim() ? 'bg-[#007AFF] text-white' : 'bg-gray-100 text-[#C7C7CC] cursor-default'}
            `}
          >
            <Plus size={14} strokeWidth={2.5} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Active tasks */}
      {tasks && tasks.length > 0 && (
        <section className="mb-6">
          <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-widest px-1 mb-3">
            En cours
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            {tasks.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                divider={i < tasks.length - 1}
                onFocus={() => focusTask(task)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Completed tasks */}
      {completed && completed.length > 0 && (
        <section className="pb-4">
          <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-widest px-1 mb-3">
            Terminées · {completed.length}
          </p>
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden opacity-50">
            {completed.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                divider={i < completed.length - 1}
                onFocus={null}
              />
            ))}
          </div>
        </section>
      )}

      {!tasks?.length && !completed?.length && (
        <div className="text-center py-16">
          <p className="text-[#C7C7CC] text-sm">Aucune tâche — planifie ta journée ci-dessus.</p>
        </div>
      )}

    </div>
  )
}

const CATEGORY_BADGE = {
  dev:      'bg-blue-500/15 text-blue-600',
  learn:    'bg-purple-500/15 text-purple-600',
  health:   'bg-orange-500/15 text-orange-600',
  personal: 'bg-gray-500/15 text-gray-600',
  project:  'bg-amber-500/15 text-amber-600',
}
const CATEGORY_LABEL = {
  dev: 'Dev', learn: 'Learn', health: 'Santé', personal: 'Perso', project: 'Projet',
}

function TaskRow({ task, divider, onFocus }) {
  const pct = Math.min(100, Math.round((task.spent_minutes / task.target_minutes) * 100))
  const resources = (() => {
    try { return JSON.parse(task.resources || '[]') } catch { return [] }
  })()

  return (
    <div className={`px-5 py-4 ${divider ? 'border-b border-gray-50' : ''}`}>
      <div className="flex items-start gap-3">

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 justify-between">
            <p className="text-[15px] font-semibold text-[#111111] leading-snug truncate">
              {task.title}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {task.category && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_BADGE[task.category] ?? 'bg-gray-100 text-gray-500'}`}>
                  {CATEGORY_LABEL[task.category] ?? task.category}
                </span>
              )}
              <span className="text-[11px] font-semibold text-[#8E8E93] tabular-nums">
                {task.spent_minutes}/{task.target_minutes}m
              </span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1 bg-gray-100 rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-[#007AFF] rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Reminder time */}
          {task.reminder_time && (
            <p className="text-[11px] text-orange-500 mt-1">
              ⏰ {format(new Date(task.reminder_time), 'HH:mm · EEE d MMM', { locale: fr })}
            </p>
          )}

          {/* Resources */}
          {resources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {resources.map((url, i) => (
                <a
                  key={i}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs bg-[#F7F7F5] text-[#8E8E93] rounded-md px-2 py-1 hover:text-[#111111] transition-colors active:opacity-70 max-w-[180px]"
                >
                  <ExternalLink size={10} strokeWidth={2} className="flex-shrink-0" />
                  <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Focus button */}
        {onFocus && (
          <button
            onClick={onFocus}
            className="mt-0.5 w-9 h-9 rounded-xl bg-[#007AFF]/10 flex items-center justify-center flex-shrink-0 transition-all active:scale-[0.90] active:opacity-70"
          >
            <Play size={14} strokeWidth={0} fill="#007AFF" className="translate-x-px" />
          </button>
        )}

      </div>
    </div>
  )
}
