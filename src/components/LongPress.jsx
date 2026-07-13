import { useRef } from 'react'
import { haptic } from '../lib/haptic'

// Button with two intents: quick tap → onTap, hold ≥600ms → onLongPress.
// Used on quest rows: tap sends the task to the timer, holding is the only
// manual way to complete it (anti "free XP" tap).
export default function LongPress({ onTap, onLongPress, disabled, className, style, children }) {
  const timer = useRef(null)
  const firedLong = useRef(false)

  const start = () => {
    if (disabled) return
    firedLong.current = false
    timer.current = setTimeout(() => {
      firedLong.current = true
      haptic.success()
      onLongPress?.()
    }, 600)
  }

  const end = (fireTap) => {
    clearTimeout(timer.current)
    if (fireTap && !firedLong.current && !disabled) onTap?.()
  }

  return (
    <button
      disabled={disabled}
      className={className}
      style={style}
      onPointerDown={start}
      onPointerUp={() => end(true)}
      onPointerLeave={() => end(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </button>
  )
}
