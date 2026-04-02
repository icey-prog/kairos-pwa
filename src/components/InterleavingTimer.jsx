import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, RotateCcw, Zap } from 'lucide-react'
import { mutate } from 'swr'
import useStore from '../store/useStore'
import { API } from '../lib/api'
import { toast } from 'sonner'

const WORK_DURATION = 25 * 60
const BREAK_DURATION = 5 * 60
const RADIUS = 72
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const pad = (n) => String(n).padStart(2, '0')
const fmt = (secs) => `${pad(Math.floor(secs / 60))}:${pad(secs % 60)}`

const DEFAULT_SUBJECTS = ['Code', 'Design']

export default function InterleavingTimer({ onSessionComplete }) {
  const [phase, setPhase] = useState('focus')
  const [timeLeft, setTimeLeft] = useState(WORK_DURATION)
  const [isRunning, setIsRunning] = useState(false)
  const [sessionCount, setSessionCount] = useState(0)
  const [subjects] = useState(DEFAULT_SUBJECTS)
  const [justCompleted, setJustCompleted] = useState(false)

  const intervalRef = useRef(null)
  const activeTask = useStore((s) => s.activeTask)

  const totalDuration = phase === 'focus' ? WORK_DURATION : BREAK_DURATION
  const progress = timeLeft / totalDuration
  const strokeOffset = CIRCUMFERENCE * (1 - progress)
  const currentSubject = subjects[sessionCount % subjects.length]
  const isFocus = phase === 'focus'
  const ringColor = isFocus ? '#007AFF' : '#34C759'

  const advancePhase = useCallback(async () => {
    setIsRunning(false)

    if (phase === 'focus') {
      // Log time on the active task
      if (activeTask) {
        try {
          await fetch(`${API}/tasks/${activeTask.id}/add_time`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ minutes: Math.floor(WORK_DURATION / 60) }),
          })
          mutate(`${API}/tasks`)
          mutate(`${API}/tasks/completed`)
        } catch (_) {}
      }

      setJustCompleted(true)
      toast.success("Focus session completed! +50 XP", {
        description: `Bien joué ! Tu as progressé dans ${currentSubject}.`,
      })
      setTimeout(() => setJustCompleted(false), 2000)
      onSessionComplete?.()
      setSessionCount((c) => c + 1)
      setPhase('break')
      setTimeLeft(BREAK_DURATION)
    } else {
      setPhase('focus')
      setTimeLeft(WORK_DURATION)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, onSessionComplete])

  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(intervalRef.current)
          advancePhase()
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [isRunning, advancePhase])

  const reset = () => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setTimeLeft(phase === 'focus' ? WORK_DURATION : BREAK_DURATION)
  }

  return (
    <div className="flex flex-col items-center py-6">

      {/* Active task title */}
      {activeTask ? (
        <div className="flex flex-col items-center mb-5 px-4 text-center">
          <p className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-widest mb-1">
            Tâche active
          </p>
          <p className="text-[15px] font-semibold text-[#111111] leading-snug">
            {activeTask.title}
          </p>
          {/* Task progress bar */}
          <div className="w-40 h-1 bg-gray-100 rounded-full mt-2.5 overflow-hidden">
            <div
              className="h-full bg-[#007AFF] rounded-full"
              style={{
                width: `${Math.min(100, Math.round((activeTask.spent_minutes / activeTask.target_minutes) * 100))}%`,
              }}
            />
          </div>
          <p className="text-[11px] text-[#8E8E93] mt-1 tabular-nums">
            {activeTask.spent_minutes}/{activeTask.target_minutes} min
          </p>
        </div>
      ) : (
        <p className="text-xs text-[#C7C7CC] mb-5">
          Aucune tâche sélectionnée — va dans le Planner
        </p>
      )}

      {/* Phase + subject label */}
      <div className="flex items-center gap-2 mb-5">
        <span className={`
          text-xs font-semibold uppercase tracking-widest px-3 py-1 rounded-full
          ${isFocus ? 'bg-[#007AFF]/10 text-[#007AFF]' : 'bg-[#34C759]/15 text-[#34C759]'}
        `}>
          {isFocus ? `Focus · ${currentSubject}` : 'Pause'}
        </span>
        {sessionCount > 0 && (
          <span className="text-xs text-[#8E8E93]">Session {sessionCount}</span>
        )}
      </div>

      {/* Ring */}
      <div className="relative flex items-center justify-center mb-8">
        <svg width={176} height={176} className="-rotate-90">
          <circle cx={88} cy={88} r={RADIUS} fill="none" stroke="#F7F7F5" strokeWidth={6} />
          <circle
            cx={88} cy={88} r={RADIUS}
            fill="none"
            stroke={ringColor}
            strokeWidth={6}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            style={{ transition: isRunning ? 'stroke-dashoffset 1s linear' : 'none' }}
          />
        </svg>

        <div className="absolute flex flex-col items-center">
          {justCompleted ? (
            <div className="flex items-center gap-1 animate-pulse">
              <Zap size={20} className="text-[#007AFF]" strokeWidth={2} />
              <span className="text-lg font-bold text-[#007AFF]">+50 XP</span>
            </div>
          ) : (
            <>
              <span className="text-[40px] font-bold text-[#111111] tabular-nums leading-none tracking-tight">
                {fmt(timeLeft)}
              </span>
              <span className="text-xs text-[#8E8E93] mt-1 font-medium">
                {isFocus ? 'minutes de focus' : 'repose-toi'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={reset}
          className="w-11 h-11 rounded-full bg-[#F7F7F5] flex items-center justify-center text-[#8E8E93] transition-all active:scale-[0.92] active:opacity-70"
        >
          <RotateCcw size={16} strokeWidth={2} />
        </button>

        <button
          onClick={() => setIsRunning((r) => !r)}
          className={`
            w-16 h-16 rounded-full flex items-center justify-center shadow-sm
            transition-all active:scale-[0.94] active:opacity-80
            ${isFocus ? 'bg-[#007AFF]' : 'bg-[#34C759]'}
          `}
        >
          {isRunning
            ? <Pause size={22} className="text-white" strokeWidth={2.5} fill="white" />
            : <Play size={22} className="text-white translate-x-0.5" strokeWidth={2.5} fill="white" />
          }
        </button>

        <div className="w-11 h-11 rounded-full bg-[#F7F7F5] flex flex-col items-center justify-center gap-0.5">
          <span className="text-[9px] text-[#8E8E93] font-medium uppercase tracking-wide leading-none">Next</span>
          <span className="text-[11px] font-semibold text-[#111111] leading-none">
            {subjects[(sessionCount + (isFocus ? 1 : 0)) % subjects.length]}
          </span>
        </div>
      </div>

      {/* Interleaving legend */}
      <div className="flex items-center gap-3 mt-6">
        {subjects.map((s, i) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${i === sessionCount % subjects.length && isFocus ? 'bg-[#007AFF]' : 'bg-gray-200'}`} />
            <span className={`text-xs font-medium ${i === sessionCount % subjects.length && isFocus ? 'text-[#111111]' : 'text-[#8E8E93]'}`}>
              {s}
            </span>
          </div>
        ))}
      </div>

    </div>
  )
}
