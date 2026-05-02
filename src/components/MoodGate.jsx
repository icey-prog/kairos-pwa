import { useState } from 'react'
import { BatteryLow, Battery, BatteryMedium, BatteryFull, Zap, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../store/useStore'
import { API } from '../lib/api'

// Solo-user display name — update when auth is added
const DISPLAY_NAME = 'ICE.Y'

const MOODS = [
  {
    score: 1,
    icon: BatteryLow,
    label: 'Épuisé',
    sublabel: 'Mode repos — tâches légères uniquement',
    color: 'text-red-400',
  },
  {
    score: 2,
    icon: Battery,
    label: 'Fatigué',
    sublabel: 'Charge réduite recommandée',
    color: 'text-orange-400',
  },
  {
    score: 3,
    icon: BatteryMedium,
    label: 'Correct',
    sublabel: 'Capacité nominale',
    color: 'text-yellow-500',
  },
  {
    score: 4,
    icon: BatteryFull,
    label: 'Éveillé',
    sublabel: 'Pleine puissance disponible',
    color: 'text-green-500',
  },
  {
    score: 5,
    icon: Zap,
    label: 'En feu',
    sublabel: 'Mode overdrive — exploite-le',
    color: 'text-[#007AFF]',
  },
]

export default function MoodGate() {
  const [selected, setSelected] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [exiting, setExiting] = useState(false)
  const setMood = useStore((s) => s.setMood)

  const handleSelect = async (mood) => {
    if (confirming || exiting) return
    setSelected(mood.score)
    setConfirming(true)

    try {
      await fetch(`${API}/mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: mood.score }),
      })
    } catch (_) {
      // Offline-first: continue regardless
    }

    localStorage.setItem('mile_last_mood_date', new Date().toDateString())
    localStorage.setItem('mile_last_mood_score', mood.score.toString())

    // Show confirmation feedback for 600ms then animate exit
    setTimeout(() => {
      setConfirming(false)
      setExiting(true)
      setTimeout(() => setMood(mood.score), 350)
    }, 600)
  }

  const selectedMood = MOODS.find((m) => m.score === selected)

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="moodgate"
          initial={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -24 }}
          transition={{ duration: 0.32, ease: [0.4, 0, 0.2, 1] }}
          className="min-h-screen bg-white flex flex-col justify-center px-6 py-12"
        >
          <div className="max-w-sm mx-auto w-full">

            {/* Header */}
            <motion.div
              className="mb-10"
              animate={exiting ? { opacity: 0, y: -8 } : { opacity: 1, y: 0 }}
            >
              <p className="text-xs font-semibold text-[#007AFF] uppercase tracking-widest mb-3">
                Neuro-Kaizen · Check-in
              </p>
              <h1 className="text-[2rem] font-bold text-[#111111] leading-tight tracking-tight">
                Bonjour {DISPLAY_NAME}
              </h1>
              <p className="mt-3 text-[15px] text-[#8E8E93] leading-relaxed">
                Ton niveau d'énergie adapte le protocole du jour.
              </p>
            </motion.div>

            {/* Mood Pills */}
            <div className="space-y-3">
              {MOODS.map((mood) => {
                const Icon = mood.icon
                const isSelected = selected === mood.score

                return (
                  <motion.button
                    key={mood.score}
                    onClick={() => handleSelect(mood)}
                    disabled={confirming || exiting}
                    whileTap={{ scale: 0.97 }}
                    animate={
                      isSelected && confirming
                        ? { scale: [1, 1.02, 1] }
                        : {}
                    }
                    transition={{ duration: 0.25 }}
                    className={`
                      w-full flex items-center gap-4 px-5 rounded-2xl border
                      min-h-[64px] transition-all duration-200
                      ${isSelected
                        ? 'bg-[#007AFF] border-[#007AFF]'
                        : 'bg-[#F7F7F5] border-transparent'
                      }
                    `}
                  >
                    <Icon
                      size={22}
                      strokeWidth={1.75}
                      className={isSelected ? 'text-white' : mood.color}
                    />
                    <div className="flex flex-col items-start text-left">
                      <span className={`text-[15px] font-semibold ${isSelected ? 'text-white' : 'text-[#111111]'}`}>
                        {mood.label}
                      </span>
                      <span className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-[#8E8E93]'}`}>
                        {isSelected && confirming ? 'Prêt — chargement de ton protocole…' : mood.sublabel}
                      </span>
                    </div>
                    <div className="ml-auto w-5 h-5 flex-shrink-0">
                      <AnimatePresence>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                            className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center"
                          >
                            {confirming
                              ? <Check size={12} className="text-white" strokeWidth={3} />
                              : <div className="w-2 h-2 rounded-full bg-white" />
                            }
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* Confirmation message */}
            <AnimatePresence>
              {confirming && selectedMood && (
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="mt-6 text-center text-sm text-[#007AFF] font-medium"
                >
                  Niveau {selectedMood.score}/5 — {selectedMood.label} ✓
                </motion.p>
              )}
            </AnimatePresence>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
