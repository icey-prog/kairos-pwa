import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { Pencil, Repeat, Trash2, ChevronRight, ChevronLeft, Plus, Check } from 'lucide-react'
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/ui'
import BottomSheet from './BottomSheet'
import { API } from '../lib/api'
import { resolveIcon } from '../lib/disciplineIcons'
import { haptic } from '../lib/haptic'
import { cn } from '../lib/utils'

const masteryColor = (lvl) =>
  lvl >= 80 ? 'text-emerald-400' : lvl >= 60 ? 'text-blue-400' : lvl >= 40 ? 'text-amber-400' : 'text-rose-400'

// Contextual actions for a Feynman note. Modes: menu → edit | convert.
export default function NoteActionSheet({ open, onClose, note, disciplines, bySlug }) {
  const [mode, setMode] = useState('menu')
  const [form, setForm] = useState(null)
  const [converted, setConverted] = useState({})   // gap index → true once a card is created
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (note) {
      setMode('menu')
      setConverted({})
      setForm({
        concept: note.concept,
        simpleExplanation: note.simpleExplanation || '',
        analogies: note.analogies?.length ? note.analogies : [''],
        gaps: note.gaps?.length ? note.gaps : [''],
        refinedExplanation: note.refinedExplanation || '',
        discipline: note.discipline,
        masteryLevel: note.masteryLevel ?? 0,
      })
    }
  }, [note])

  if (!note || !form) return null
  const config = bySlug[note.discipline] ?? { name: note.discipline, color: '#3B82F6', icon: 'BookOpen' }

  const saveEdit = async () => {
    if (!form.concept.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/feynman/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: form.concept,
          simple_explanation: form.simpleExplanation,
          analogies: JSON.stringify(form.analogies.filter((a) => a.trim())),
          gaps: JSON.stringify(form.gaps.filter((g) => g.trim())),
          refined_explanation: form.refinedExplanation,
          mastery_level: form.masteryLevel,
          discipline: form.discipline,
        }),
      })
      if (!res.ok) throw new Error(`edit failed: ${res.status}`)
      haptic.success()
      mutate(`${API}/feynman`)
      onClose()
    } catch (err) {
      console.error('[NoteActionSheet.saveEdit]', err)
      haptic.error()
    } finally {
      setSaving(false)
    }
  }

  // Each gap → a prefilled SM-2 card (front = gap, back empty → user completes later).
  const convertGap = async (gap, i) => {
    if (converted[i]) return
    try {
      const res = await fetch(`${API}/spaced-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front: gap,
          back: '',
          discipline: note.discipline,
          interval: 1,
          repetition: 0,
          easiness_factor: 2.5,
          next_review_date: new Date().toISOString(),
        }),
      })
      if (!res.ok) throw new Error(`convert failed: ${res.status}`)
      haptic.success()
      mutate(`${API}/spaced-cards`)
      setConverted((prev) => ({ ...prev, [i]: true }))
    } catch (err) {
      console.error('[NoteActionSheet.convertGap]', err)
      haptic.error()
    }
  }

  const remove = async () => {
    if (!confirm('Supprimer cette note ?')) return
    try {
      const res = await fetch(`${API}/feynman/${note.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`delete failed: ${res.status}`)
      haptic.success()
      mutate(`${API}/feynman`)
      onClose()
    } catch (err) {
      console.error('[NoteActionSheet.remove]', err)
      haptic.error()
    }
  }

  const updateField = (key, i, v) => {
    const arr = [...form[key]]; arr[i] = v; setForm({ ...form, [key]: arr })
  }
  const addField = (key) => setForm({ ...form, [key]: [...form[key], ''] })

  const realGaps = (note.gaps || []).filter((g) => g.trim())
  const title = mode === 'edit' ? 'Éditer la note' : mode === 'convert' ? 'Convertir en cartes' : note.concept

  const Action = ({ Icon, label, sub, onClick, danger, disabled }) => (
    <button
      onClick={() => { if (disabled) return; haptic.select(); onClick() }}
      disabled={disabled}
      className={cn(
        'w-full flex items-center gap-3 min-h-[56px] px-3 rounded-2xl text-left transition-all active:scale-[0.98]',
        disabled && 'opacity-40',
        danger ? 'active:bg-rose-500/10' : 'active:bg-[var(--color-secondary)]',
      )}
    >
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', danger ? 'bg-rose-500/15' : 'bg-[var(--color-secondary)]')}>
        <Icon className={cn('w-5 h-5', danger ? 'text-rose-500' : 'text-[var(--color-foreground)]')} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-[15px] font-semibold leading-tight', danger ? 'text-rose-500' : 'text-[var(--color-foreground)]')}>{label}</p>
        {sub && <p className="text-[12px] text-[var(--color-muted-foreground)] mt-0.5 truncate">{sub}</p>}
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--color-muted-foreground)] flex-shrink-0" />
    </button>
  )

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {/* ── MENU ──────────────────────────────────────────────── */}
      {mode === 'menu' && (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${config.color}20`, color: config.color }}>
              {config.name}
            </span>
            <span className={cn('text-[11px] font-semibold', masteryColor(note.masteryLevel))}>{note.masteryLevel}% maîtrisé</span>
          </div>
          <Action Icon={Pencil} label="Éditer" sub="Toutes les étapes + maîtrise" onClick={() => setMode('edit')} />
          <Action
            Icon={Repeat}
            label="Convertir en cartes"
            sub={realGaps.length ? `${realGaps.length} lacune(s) → cartes SM-2` : 'Aucune lacune à convertir'}
            onClick={() => setMode('convert')}
            disabled={realGaps.length === 0}
          />
          <Action Icon={Trash2} label="Supprimer" sub="Action définitive" onClick={remove} danger />
        </div>
      )}

      {/* ── EDIT ──────────────────────────────────────────────── */}
      {mode === 'edit' && (
        <div className="space-y-4">
          <BackBtn onClick={() => setMode('menu')} />
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Concept</label>
            <Input value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Explication simple</label>
            <Textarea value={form.simpleExplanation} onChange={(e) => setForm({ ...form, simpleExplanation: e.target.value })} className="min-h-[80px]" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Analogies</label>
            {form.analogies.map((a, i) => (
              <Input key={i} value={a} onChange={(e) => updateField('analogies', i, e.target.value)} className="mb-2" placeholder={`Analogie ${i + 1}`} />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addField('analogies')} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Analogie
            </Button>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Lacunes</label>
            {form.gaps.map((g, i) => (
              <Input key={i} value={g} onChange={(e) => updateField('gaps', i, e.target.value)} className="mb-2" placeholder={`Lacune ${i + 1}`} />
            ))}
            <Button type="button" variant="outline" size="sm" onClick={() => addField('gaps')} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Lacune
            </Button>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Explication raffinée</label>
            <Textarea value={form.refinedExplanation} onChange={(e) => setForm({ ...form, refinedExplanation: e.target.value })} className="min-h-[70px]" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Discipline</label>
            <Select value={form.discipline} onValueChange={(v) => setForm({ ...form, discipline: v })}>
              <SelectTrigger><SelectValue placeholder="Discipline" /></SelectTrigger>
              <SelectContent>
                {disciplines.map((d) => {
                  const Icon = resolveIcon(d.icon)
                  return (
                    <SelectItem key={d.slug} value={d.slug}>
                      <Icon className="w-4 h-4" style={{ color: d.color }} />
                      {d.name}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Niveau de maîtrise</label>
            <input
              type="range" min="0" max="100"
              value={form.masteryLevel}
              onChange={(e) => setForm({ ...form, masteryLevel: parseInt(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-[var(--color-muted-foreground)] mt-1">
              <span>Débutant</span>
              <span className={masteryColor(form.masteryLevel)}>{form.masteryLevel}%</span>
              <span>Expert</span>
            </div>
          </div>
          <Button onClick={saveEdit} className="w-full" disabled={!form.concept.trim() || saving}>
            Enregistrer
          </Button>
        </div>
      )}

      {/* ── CONVERT ───────────────────────────────────────────── */}
      {mode === 'convert' && (
        <div className="space-y-4">
          <BackBtn onClick={() => setMode('menu')} />
          <p className="text-[13px] text-[var(--color-muted-foreground)]">
            Chaque lacune devient une carte SM-2 (réponse à compléter ensuite).
          </p>
          <div className="space-y-2">
            {realGaps.map((gap, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-secondary)]">
                <p className="flex-1 min-w-0 text-[14px] text-[var(--color-foreground)]">{gap}</p>
                {converted[i] ? (
                  <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-500 flex-shrink-0">
                    <Check className="w-4 h-4" /> Créée
                  </span>
                ) : (
                  <Button size="sm" onClick={() => convertGap(gap, i)} className="flex-shrink-0">
                    <Plus className="w-4 h-4 mr-1" /> Carte
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  )
}

function BackBtn({ onClick }) {
  return (
    <button
      onClick={() => { haptic.light(); onClick() }}
      className="flex items-center gap-1 text-[13px] font-medium text-[var(--color-muted-foreground)] active:scale-95 transition-transform -ml-1"
    >
      <ChevronLeft className="w-4 h-4" /> Retour
    </button>
  )
}
