import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { API, apiFetch } from '../lib/api'

export default function DisciplinePicker({ onDone }) {
  const [disciplines, setDisciplines] = useState([])
  const [selected, setSelected] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiFetch(`${API}/disciplines`)
      .then((r) => r.json())
      .then((list) => setDisciplines(Array.isArray(list) ? list : []))
      .finally(() => setLoading(false))
  }, [])

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await apiFetch(`${API}/user/disciplines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discipline_ids: [...selected] }),
      })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[var(--color-background)] flex flex-col px-6 py-12"
    >
      <div className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
      <div className="max-w-sm mx-auto w-full flex flex-col flex-1">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-5 rounded-full bg-gradient-to-b from-blue-500 to-purple-500" />
            <p className="text-xs font-semibold text-[#007AFF] uppercase tracking-widest">
              Étape 2 · Tes cours
            </p>
          </div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)] leading-tight tracking-tight">
            Quels cours t'intéressent ?
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Tu ne verras que ceux-ci dans ton Hub — modifiable plus tard.
          </p>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pb-4">
          {loading && <p className="text-sm text-[var(--color-muted-foreground)]">Chargement…</p>}
          {!loading && disciplines.length === 0 && (
            <p className="text-sm text-[var(--color-muted-foreground)]">Aucune discipline disponible pour l'instant.</p>
          )}
          {disciplines.map((d) => {
            const isSelected = selected.has(d.id)
            return (
              <button
                key={d.id}
                onClick={() => toggle(d.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-colors ${
                  isSelected ? 'bg-[#007AFF]/10 border-[#007AFF]' : 'bg-[var(--color-secondary)] border-transparent'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-[15px] text-[var(--color-foreground)] text-left flex-1">{d.name}</span>
                {isSelected && <Check size={16} className="text-[#007AFF]" strokeWidth={3} />}
              </button>
            )
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={saving || selected.size === 0}
          className="w-full py-4 rounded-2xl bg-[#007AFF] text-white font-semibold text-[15px] disabled:opacity-50 mt-4"
        >
          {saving ? 'Enregistrement…' : `Continuer (${selected.size} choisi${selected.size > 1 ? 's' : ''})`}
        </button>
      </div>
    </motion.div>
  )
}
