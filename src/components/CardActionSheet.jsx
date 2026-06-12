import { useState, useEffect } from 'react'
import { mutate } from 'swr'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import {
  Brain, Pencil, History, Trash2, ChevronRight, Star, Clock, TrendingUp, ChevronLeft,
} from 'lucide-react'
import { Button, Textarea, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../lib/ui'
import BottomSheet from './BottomSheet'
import { API } from '../lib/api'
import { resolveIcon } from '../lib/disciplineIcons'
import { haptic } from '../lib/haptic'
import { cn } from '../lib/utils'

const QUALITY_STARS = (q) => '★'.repeat(q) + '☆'.repeat(5 - q)

// Contextual actions for a single SM-2 card. Modes: menu → edit | history.
export default function CardActionSheet({ open, onClose, card, disciplines, bySlug, onReviewNow }) {
  const [mode, setMode] = useState('menu')
  const [form, setForm] = useState({ front: '', back: '', discipline: '' })
  const [logs, setLogs] = useState(null)
  const [saving, setSaving] = useState(false)

  // Reset to menu + hydrate edit form each time a card opens.
  useEffect(() => {
    if (card) {
      setMode('menu')
      setForm({ front: card.front, back: card.back || '', discipline: card.discipline })
      setLogs(null)
    }
  }, [card])

  if (!card) return null
  const config = bySlug[card.discipline] ?? { name: card.discipline, color: '#3B82F6', icon: 'BookOpen' }

  const saveEdit = async () => {
    if (!form.front.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/spaced-cards/${card.id}`, {
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

  const loadHistory = async () => {
    setMode('history')
    try {
      const data = await fetch(`${API}/spaced-cards/${card.id}/review-logs`).then((r) => r.json())
      setLogs(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error('[CardActionSheet.loadHistory]', err)
      setLogs([])
    }
  }

  const remove = async () => {
    if (!confirm('Supprimer cette carte ?')) return
    try {
      const res = await fetch(`${API}/spaced-cards/${card.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`delete failed: ${res.status}`)
      haptic.success()
      mutate(`${API}/spaced-cards`)
      onClose()
    } catch (err) {
      console.error('[CardActionSheet.remove]', err)
      haptic.error()
    }
  }

  const title = mode === 'edit' ? 'Éditer la carte' : mode === 'history' ? 'Historique' : card.front

  // One action row — consistent icon + label + chevron, 56px tap target.
  const Action = ({ Icon, label, sub, onClick, danger }) => (
    <button
      onClick={() => { haptic.select(); onClick() }}
      className={cn(
        'w-full flex items-center gap-3 min-h-[56px] px-3 rounded-2xl text-left transition-all active:scale-[0.98]',
        danger ? 'active:bg-rose-500/10' : 'active:bg-[var(--color-secondary)]',
      )}
    >
      <div className={cn(
        'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
        danger ? 'bg-rose-500/15' : 'bg-[var(--color-secondary)]',
      )}>
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
            <span
              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
              style={{ background: `${config.color}20`, color: config.color }}
            >
              {config.name}
            </span>
            {!card.back && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                Sans réponse
              </span>
            )}
          </div>
          <Action Icon={Brain} label="Réviser maintenant" sub="Session sur cette carte" onClick={() => { onReviewNow(card); onClose() }} />
          <Action Icon={Pencil} label="Éditer" sub="Question, réponse, discipline" onClick={() => setMode('edit')} />
          <Action Icon={History} label="Historique" sub="Révisions passées (SM-2)" onClick={loadHistory} />
          <Action Icon={Trash2} label="Supprimer" sub="Action définitive" onClick={remove} danger />
        </div>
      )}

      {/* ── EDIT ──────────────────────────────────────────────── */}
      {mode === 'edit' && (
        <div className="space-y-4">
          <BackBtn onClick={() => setMode('menu')} />
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

      {/* ── HISTORY ───────────────────────────────────────────── */}
      {mode === 'history' && (
        <div className="space-y-4">
          <BackBtn onClick={() => setMode('menu')} />

          {/* Current SM-2 state — makes the algorithm legible */}
          <div className="grid grid-cols-3 gap-2">
            <Stat Icon={Clock}       label="Prochaine"  value={format(card.next_review_date, 'dd MMM', { locale: fr })} />
            <Stat Icon={TrendingUp}  label="Facilité"   value={card.easiness_factor.toFixed(2)} />
            <Stat Icon={Star}        label="Révisions"  value={`${card.repetition}`} />
          </div>

          {logs === null ? (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-6">Chargement…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-6">Aucune révision enregistrée pour l'instant.</p>
          ) : (
            <ol className="space-y-2">
              {logs.map((log) => (
                <li key={log.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-secondary)]">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[var(--color-foreground)]">
                      {log.reviewed_at ? format(parseISO(log.reviewed_at), 'dd MMM yyyy · HH:mm', { locale: fr }) : '—'}
                    </p>
                    <p className="text-[12px] text-[var(--color-muted-foreground)] mt-0.5">
                      Intervalle → {log.interval_after} j
                    </p>
                  </div>
                  <span className="text-amber-500 text-[13px] tracking-tight flex-shrink-0">{QUALITY_STARS(log.quality)}</span>
                </li>
              ))}
            </ol>
          )}
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
