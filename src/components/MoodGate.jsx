import { useState } from 'react'
import { BatteryLow, Battery, BatteryMedium, BatteryFull, Zap } from 'lucide-react'
import useStore from '../store/useStore'
import { API } from '../lib/api'

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
  const [loading, setLoading] = useState(false)
  const setMood = useStore((s) => s.setMood)

  const handleSelect = async (mood) => {
    if (loading) return
    setSelected(mood.score)
    setLoading(true)

    try {
      await fetch(`${API}/mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: mood.score }),
      })
    } catch (_) {
      // Offline-first: continue regardless
    }

    setTimeout(() => setMood(mood.score), 350)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs font-semibold text-[#007AFF] uppercase tracking-widest mb-3">
            Neuro-Kaizen · Check-in
          </p>
          <h1 className="text-[2rem] font-bold text-[#111111] leading-tight tracking-tight">
            Comment va<br />le système ?
          </h1>
          <p className="mt-3 text-[15px] text-[#8E8E93] leading-relaxed">
            Ton niveau d'énergie adapte le protocole du jour.
          </p>
        </div>

        {/* Mood Pills */}
        <div className="space-y-3">
          {MOODS.map((mood) => {
            const Icon = mood.icon
            const isSelected = selected === mood.score

            return (
              <button
                key={mood.score}
                onClick={() => handleSelect(mood)}
                disabled={loading}
                className={`
                  w-full flex items-center gap-4 px-5 rounded-2xl border
                  min-h-[64px] transition-all duration-200
                  active:scale-[0.98] active:opacity-70
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
                    {mood.sublabel}
                  </span>
                </div>
                <div className="ml-auto w-5 h-5 flex-shrink-0">
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white" />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

      </div>
    </div>
  )
}
