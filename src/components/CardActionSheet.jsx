import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import { motion } from 'framer-motion'
import {
  Brain, Pencil, Trash2, Star, Clock, TrendingUp, ChevronLeft, Bug, Eye, Timer,
} from 'lucide-react'
import { Button, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/ui'
import BottomSheet from './BottomSheet'
import KnowledgeBadges from './KnowledgeBadges'
import CodeText from './CodeText'
import PersonalNotes from './PersonalNotes'
import Illustration from './Illustration'
import { API, apiFetch } from '../lib/api'
import { resolveIcon } from '../lib/disciplineIcons'
import { haptic } from '../lib/haptic'
import { cn } from '../lib/utils'
import { createLinkedQuest } from '../lib/questLink'
import { adaptTask } from '../lib/taskBridge'
import useStore from '../store/useStore'

const QUALITY_STARS = (q) => '★'.repeat(q) + '☆'.repeat(5 - q)

// Full detail view for a single SM-2 card. Modes: detail (read) → edit.
export default function CardActionSheet({ open, onClose, card, disciplines, bySlug, onReviewNow }) {
  const [mode, setMode] = useState('detail')
  const [form, setForm] = useState({ front: '', back: '', discipline: '' })
  const [logs, setLogs] = useState(null)
  const [saving, setSaving] = useState(false)
  const [revealed, setRevealed] = useState(false)   // answer hidden until user tries to recall
  const [illustrationSvg, setIllustrationSvg] = useState(null)
  const setActiveTask = useStore((s) => s.setActiveTask)
  const setMainTab = useStore((s) => s.setMainTab)
  const setActiveTab = useStore((s) => s.setActiveTab)

  const startFocus = async () => {
    try {
      const task = await createLinkedQuest({ title: `Réviser — ${card.front.slice(0, 180)}`, type: 'card', id: card.id })
      mutate(`${API}/tasks`)
      haptic.light()
      setActiveTask(adaptTask(task))
      setMainTab('focus')
      setActiveTab('timer')
      onClose()
    } catch (err) {
      console.error('[CardActionSheet.startFocus]', err)
      haptic.error()
    }
  }

  // Reset to detail + hydrate edit form + load history each time a card opens.
  useEffect(() => {
    if (!card) return
    setMode('detail')
    setRevealed(false)
    setForm({ front: card.front, back: card.back || '', discipline: card.discipline })
    setIllustrationSvg(card.illustration_svg || null)
    setLogs(null)
    let cancelled = false
    apiFetch(`${API}/spaced-cards/${card.id}/review-logs`)
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setLogs(Array.isArray(data) ? data : []) })
      .catch(() => { if (!cancelled) setLogs([]) })
    return () => { cancelled = true }
  }, [card])

  if (!card) return null
  const config = bySlug[card.discipline] ?? { name: card.discipline, color: '#3B82F6', icon: 'BookOpen' }
  const DiscIcon = resolveIcon(config.icon)

  const saveEdit = async () => {
    if (!form.front.trim() || saving) return
    setSaving(true)
    try {
      const res = await apiFetch(`${API}/spaced-cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ front: form.front, back: form.back, discipline: form.discipline }),
      })
      if (!res.ok) throw new Error(`edit failed: ${res.status}`)
      haptic.success()
      mutate(`${API}/spaced-cards`)
      onClose()
    } catch (err) {
      console.error('[CardActionSheet.saveEdit]', err)
      haptic.error()
    } finally {
      setSaving(false)
    }
  }

  const savePersonalNotes = async (value) => {
    try {
      const res = await apiFetch(`${API}/spaced-cards/${card.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ personal_notes: value }),
      })
      if (!res.ok) throw new Error(`personal_notes update failed: ${res.status}`)
      mutate(`${API}/spaced-cards`)
    } catch (err) {
      console.error('[CardActionSheet.savePersonalNotes]', err)
      haptic.error()
    }
  }

  const remove = async () => {
    if (!confirm('Supprimer cette carte ?')) return
    try {
      const res = await apiFetch(`${API}/spaced-cards/${card.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`delete failed: ${res.status}`)
      haptic.success()
      mutate(`${API}/spaced-cards`)
      onClose()
    } catch (err) {
      console.error('[CardActionSheet.remove]', err)
      haptic.error()
    }
  }

  const title = mode === 'edit' ? 'Éditer la carte' : 'Détail de la carte'

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      {/* ── DETAIL (read) ─────────────────────────────────────── */}
      {mode === 'detail' && (
        <div className="space-y-5">
          {/* Discipline context — the link to your project */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className="inline-flex items-center gap-1.5 text-[12px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: `${config.color}20`, color: config.color }}
            >
              <DiscIcon className="w-3.5 h-3.5" />
              {config.name}
            </span>
            {!card.back && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                Sans réponse
              </span>
            )}
          </div>

          {/* Knowledge taxonomy badges */}
          <KnowledgeBadges item={card} />

          {/* Question — always visible */}
          <div className="rounded-2xl border border-[var(--color-border)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] mb-1.5">Question</p>
            <CodeText text={card.front} className="text-[16px] font-semibold text-[var(--color-foreground)]" />
          </div>

          {/* Answer — hidden until reveal (try to recall first) */}
          {!revealed ? (
            <Button onClick={() => { haptic.light(); setRevealed(true) }} className="w-full gap-2" size="lg">
              <Eye className="w-5 h-5" /> Montrer la réponse
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="space-y-4"
            >
              <div className="rounded-2xl bg-[var(--color-secondary)] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)] mb-1.5">Réponse</p>
                {card.back ? (
                  <CodeText text={card.back} className="text-[15px] text-[var(--color-foreground)]" />
                ) : (
                  <p className="text-sm text-[var(--color-muted-foreground)] italic">Aucune réponse — édite la carte pour la compléter.</p>
                )}
              </div>

              {/* Bug-fix breakdown — only for bug_fix cards with detail */}
              {card.knowledge_category === 'bug_fix' && (card.bug_why || card.bug_fix_how || card.bug_principles) && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 text-rose-500" />
                    <p className="text-[13px] font-bold text-rose-500">Bug Fix</p>
                  </div>
                  {card.bug_why && <BugRow label="Pourquoi" value={card.bug_why} />}
                  {card.bug_fix_how && <BugRow label="Corrigé comment" value={card.bug_fix_how} />}
                  {card.bug_principles && <BugRow label="Principes" value={card.bug_principles} />}
                </div>
              )}
            </motion.div>
          )}

          {/* SM-2 state */}
          <div className="grid grid-cols-3 gap-2">
            <Stat Icon={Clock}      label="Prochaine"  value={format(card.next_review_date, 'dd MMM', { locale: fr })} />
            <Stat Icon={TrendingUp} label="Facilité"   value={card.easiness_factor.toFixed(2)} />
            <Stat Icon={Star}       label="Révisions"  value={`${card.repetition}`} />
          </div>

          {/* History timeline */}
          <div>
            <p className="text-[13px] font-bold text-[var(--color-foreground)] mb-2">Historique des révisions</p>
            {logs === null ? (
              <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">Chargement…</p>
            ) : logs.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)] text-center py-4">Pas encore révisée.</p>
            ) : (
              <ol className="space-y-2">
                {logs.map((log) => (
                  <li key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-secondary)]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[var(--color-foreground)]">
                        {log.reviewed_at ? format(parseISO(log.reviewed_at), 'dd MMM yyyy · HH:mm', { locale: fr }) : '—'}
                      </p>
                      <p className="text-[12px] text-[var(--color-muted-foreground)] mt-0.5">Intervalle → {log.interval_after} j</p>
                    </div>
                    <span className="text-amber-500 text-[13px] tracking-tight flex-shrink-0">{QUALITY_STARS(log.quality)}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          <Illustration
            svg={illustrationSvg}
            endpoint={() => apiFetch(`${API}/spaced-cards/${card.id}/illustrate`, { method: 'POST' })}
            onGenerated={(updated) => { setIllustrationSvg(updated.illustration_svg); mutate(`${API}/spaced-cards`) }}
          />

          <PersonalNotes value={card.personal_notes} onSave={savePersonalNotes} />

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button onClick={() => { haptic.select(); onReviewNow(card); onClose() }} className="flex-1 gap-2">
              <Brain className="w-4 h-4" /> Réviser
            </Button>
            <Button variant="outline" onClick={startFocus} className="gap-2">
              <Timer className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={() => { haptic.select(); setMode('edit') }} className="gap-2">
              <Pencil className="w-4 h-4" /> Éditer
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
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Question (recto)</label>
            <Textarea value={form.front} onChange={(e) => setForm({ ...form, front: e.target.value })} className="min-h-[70px]" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Réponse (verso)</label>
            <Textarea value={form.back} onChange={(e) => setForm({ ...form, back: e.target.value })} className="min-h-[70px]" placeholder="Complète la réponse…" />
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
          <Button onClick={saveEdit} className="w-full" disabled={!form.front.trim() || saving}>
            Enregistrer
          </Button>
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

function Stat({ Icon, label, value }) {
  return (
    <div className="rounded-xl bg-[var(--color-secondary)] p-3 text-center">
      <Icon className="w-4 h-4 mx-auto mb-1 text-[var(--color-muted-foreground)]" />
      <p className="text-[14px] font-bold text-[var(--color-foreground)] leading-none">{value}</p>
      <p className="text-[10px] text-[var(--color-muted-foreground)] mt-1">{label}</p>
    </div>
  )
}

function BugRow({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-500/80">{label}</p>
      <CodeText text={value} className="text-[14px] text-[var(--color-foreground)] mt-0.5" />
    </div>
  )
}
