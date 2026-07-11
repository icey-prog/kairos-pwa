import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { Pencil, Repeat, Trash2, ChevronLeft, Plus, Check, Sparkles, Search, BookOpen, Edit3 } from 'lucide-react'
import { Button, Input, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Tip } from '../lib/ui'
import BottomSheet from './BottomSheet'
import KnowledgeBadges from './KnowledgeBadges'
import CodeText from './CodeText'
import PersonalNotes from './PersonalNotes'
import Illustration from './Illustration'
import { API, apiFetch } from '../lib/api'
import { resolveIcon } from '../lib/disciplineIcons'
import { haptic } from '../lib/haptic'
import { cn } from '../lib/utils'
import { reviewStatusMeta, nextReviewStatus } from '../lib/knowledge'

const masteryColor = (lvl) =>
  lvl >= 80 ? 'text-emerald-400' : lvl >= 60 ? 'text-blue-400' : lvl >= 40 ? 'text-amber-400' : 'text-rose-400'

// Full detail view for a Feynman note. Modes: detail (read) → edit | convert.
export default function NoteActionSheet({ open, onClose, note, disciplines, bySlug }) {
  const [mode, setMode] = useState('detail')
  const [form, setForm] = useState(null)
  const [converted, setConverted] = useState({})   // gap index → true once a card is created
  const [saving, setSaving] = useState(false)
  const [reviewStatus, setReviewStatus] = useState('not_reviewed')
  const [illustrationSvg, setIllustrationSvg] = useState(null)

  useEffect(() => {
    if (note) {
      setMode('detail')
      setConverted({})
      setReviewStatus(note.review_status || 'not_reviewed')
      setIllustrationSvg(note.illustration_svg || null)
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
  const DiscIcon = resolveIcon(config.icon)

  const saveEdit = async () => {
    if (!form.concept.trim() || saving) return
    setSaving(true)
    try {
      const res = await apiFetch(`${API}/feynman/${note.id}`, {
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
      const res = await apiFetch(`${API}/spaced-cards`, {
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

  const savePersonalNotes = async (value) => {
    try {
      const res = await apiFetch(`${API}/feynman/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal_notes: value }),
      })
      if (!res.ok) throw new Error(`personal_notes update failed: ${res.status}`)
      mutate(`${API}/feynman`)
    } catch (err) {
      console.error('[NoteActionSheet.savePersonalNotes]', err)
      haptic.error()
    }
  }

  const cycleReviewStatus = async () => {
    const next = nextReviewStatus(reviewStatus)
    setReviewStatus(next)
    haptic.light()
    try {
      const res = await apiFetch(`${API}/feynman/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ review_status: next }),
      })
      if (!res.ok) throw new Error(`review status update failed: ${res.status}`)
      mutate(`${API}/feynman`)
    } catch (err) {
      console.error('[NoteActionSheet.cycleReviewStatus]', err)
      setReviewStatus(note.review_status || 'not_reviewed')
      haptic.error()
    }
  }

  const remove = async () => {
    if (!confirm('Supprimer cette note ?')) return
    try {
      const res = await apiFetch(`${API}/feynman/${note.id}`, { method: 'DELETE' })
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
  const realAnalogies = (note.analogies || []).filter((a) => a.trim())
  const title = mode === 'edit' ? 'Éditer la note' : mode === 'convert' ? 'Convertir en cartes' : 'Détail de la note'

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {/* ── DETAIL (read) ─────────────────────────────────────── */}
      {mode === 'detail' && (
        <div className="space-y-5">
          {/* Discipline + mastery */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${config.color}20`, color: config.color }}>
              <DiscIcon className="w-3.5 h-3.5" />
              {config.name}
            </span>
            <span className={cn('text-[12px] font-semibold', masteryColor(note.masteryLevel))}>{note.masteryLevel}% maîtrisé</span>
          </div>

          {/* Knowledge taxonomy badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <KnowledgeBadges item={note} />
            <ReviewStatusBadge status={reviewStatus} onClick={cycleReviewStatus} />
          </div>

          <h3 className="text-[18px] font-bold text-[var(--color-foreground)] leading-tight">{note.concept}</h3>

          {/* Step 1 — simple explanation */}
          {note.simpleExplanation && (
            <Step Icon={Edit3} color="#3b82f6" label="Explication simple">
              <CodeText text={note.simpleExplanation} className="text-[15px] text-[var(--color-foreground)]" />
            </Step>
          )}

          {/* Step 2 — analogies */}
          {realAnalogies.length > 0 && (
            <Step Icon={Sparkles} color="#f59e0b" label="Analogies">
              <div className="flex flex-wrap gap-2">
                {realAnalogies.map((a, i) => (
                  <span key={i} className="text-[13px] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-500">{a}</span>
                ))}
              </div>
            </Step>
          )}

          {/* Step 3 — gaps */}
          {realGaps.length > 0 && (
            <Step Icon={Search} color="#f43f5e" label="Lacunes">
              <ul className="space-y-2.5">
                {realGaps.map((g, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 flex-shrink-0" />
                    <CodeText text={g} className="flex-1 min-w-0 text-[14px] text-[var(--color-foreground)]" />
                  </li>
                ))}
              </ul>
            </Step>
          )}

          {/* Step 4 — refined */}
          {note.refinedExplanation && (
            <Step Icon={BookOpen} color="#10b981" label="Explication raffinée">
              <CodeText text={note.refinedExplanation} className="text-[15px] text-[var(--color-foreground)]" />
            </Step>
          )}

          <Illustration
            svg={illustrationSvg}
            endpoint={() => apiFetch(`${API}/feynman/${note.id}/illustrate`, { method: 'POST' })}
            onGenerated={(updated) => { setIllustrationSvg(updated.illustration_svg); mutate(`${API}/feynman`) }}
          />

          <PersonalNotes value={note.personal_notes} onSave={savePersonalNotes} />

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button onClick={() => { haptic.select(); setMode('edit') }} className="flex-1 gap-2">
              <Pencil className="w-4 h-4" /> Éditer
            </Button>
            <Button
              variant="outline"
              onClick={() => { if (!realGaps.length) return; haptic.select(); setMode('convert') }}
              disabled={realGaps.length === 0}
              className="gap-2"
            >
              <Repeat className="w-4 h-4" /> Convertir
            </Button>
            <Button variant="outline" onClick={remove} className="text-rose-500">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── EDIT ──────────────────────────────────────────────── */}
      {mode === 'edit' && (
        <div className="space-y-4">
          <BackBtn onClick={() => setMode('detail')} />
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
          <BackBtn onClick={() => setMode('detail')} />
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

// Tap to cycle: not_reviewed → to_review → reviewed → not_reviewed.
function ReviewStatusBadge({ status, onClick }) {
  const meta = reviewStatusMeta(status)
  const next = reviewStatusMeta(nextReviewStatus(status))
  return (
    <Tip content={`Taper pour passer à : ${next.label}`}>
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full active:scale-95 transition-transform"
        style={{ background: `${meta.color}20`, color: meta.color }}
      >
        <meta.Icon className="w-3 h-3" />
        {meta.label}
      </button>
    </Tip>
  )
}

// One labelled Feynman step block in the detail read view.
function Step({ Icon, color, label, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4" style={{ color }} />
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">{label}</p>
      </div>
      {children}
    </div>
  )
}
