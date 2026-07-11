import { useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import Fuse from 'fuse.js'
import {
  Repeat, Plus, Brain, Clock, CheckCircle2, XCircle,
  TrendingUp, Search, RotateCcw, ChevronRight, ChevronLeft, NotebookPen,
} from 'lucide-react'
import { differenceInDays, parseISO, isAfter, startOfDay } from 'date-fns'
import useSWR, { mutate } from 'swr'
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/ui'
import { cn } from '../lib/utils'
import { API, fetcher, apiFetch } from '../lib/api'
import { haptic } from '../lib/haptic'
import { useDisciplines } from '../hooks/useDisciplines'
import { REVIEW_STATUSES } from '../lib/knowledge'
import CodeText from './CodeText'
import { resolveIcon } from '../lib/disciplineIcons'
import NewDisciplineDialog from './NewDisciplineDialog'
import CardActionSheet from './CardActionSheet'
import KnowledgeBadges from './KnowledgeBadges'
import DisciplineHub from './DisciplineHub'
import KnowledgeSections from './KnowledgeSections'
import DisciplineGlyph from './DisciplineGlyph'

const ADD_DISCIPLINE = '__add__'   // sentinel value for the "+ Nouvelle discipline" select entry

// ─── SM-2 algorithm ──────────────────────────────────────────────────────────
function sm2(item, quality) {
  let { easiness_factor, repetition, interval } = item
  if (quality >= 3) {
    if (repetition === 0) interval = 1
    else if (repetition === 1) interval = 6
    else interval = Math.round(interval * easiness_factor)
    repetition++
    easiness_factor = Math.max(1.3, easiness_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  } else {
    repetition = 0
    interval = 1
  }
  const nextReviewDate = new Date()
  nextReviewDate.setDate(nextReviewDate.getDate() + interval)
  return { ...item, easiness_factor, repetition, interval, next_review_date: nextReviewDate }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
// A card is due if its next_review_date is not strictly after today (day granularity).
// differenceInDays truncates toward zero → a card due in 23h counted as due. Use day boundaries.
const isCardDue = (date, today = new Date()) =>
  !isAfter(startOfDay(date), startOfDay(today))

const qualityLabels = [
  { value: 0, label: 'Oublié',      color: 'text-rose-500' },
  { value: 1, label: 'Très dur',    color: 'text-orange-500' },
  { value: 2, label: 'Difficile',   color: 'text-amber-500' },
  { value: 3, label: 'Correct',     color: 'text-blue-500' },
  { value: 4, label: 'Facile',      color: 'text-emerald-500' },
  { value: 5, label: 'Très facile', color: 'text-emerald-400' },
]

// ─── Component ───────────────────────────────────────────────────────────────
export default function SpacedRepetition() {
  const { data: rawItems } = useSWR(`${API}/spaced-cards`, fetcher, { refreshInterval: 10000 })
  const { disciplines, bySlug } = useDisciplines()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [reviewQueue, setReviewQueue] = useState([])      // snapshot — frozen at session start
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [newItem, setNewItem] = useState({ content: '', back: '', discipline: '' })
  const [saving, setSaving] = useState(false)
  // Hub drill-down
  const [hubSlug, setHubSlug] = useState(null)   // null = discipline hub, else a discipline view
  const [search, setSearch] = useState('')
  const [newDisciplineOpen, setNewDisciplineOpen] = useState(false)
  const [activeCard, setActiveCard] = useState(null)   // card whose detail sheet is open
  const sessionStartRef = useRef(null)                  // wall-clock start of the review session (quest logging)

  const today = new Date()
  const items = (rawItems || []).map(i => ({ ...i, next_review_date: parseISO(i.next_review_date) }))

  const isDue = (item) => isCardDue(item.next_review_date, today)
  const dueToday = items.filter(isDue)

  // Per-discipline stats for the hub cards.
  // Card status mapping: due → to_review, never reviewed (repetition 0) → not_reviewed, else reviewed.
  const hubStats = {}
  for (const it of items) {
    const s = (hubStats[it.discipline] ||= { total: 0, due: 0, _byStatus: { not_reviewed: 0, to_review: 0, reviewed: 0 } })
    s.total += 1
    if (isDue(it)) { s.due += 1; s._byStatus.to_review += 1 }
    else if (it.repetition === 0) s._byStatus.not_reviewed += 1
    else s._byStatus.reviewed += 1
  }
  for (const slug in hubStats) {
    const s = hubStats[slug]
    s.sub = s.due > 0 ? `${s.due} à réviser` : 'à jour'
    s.dueBadge = s.due
    const dominant = Object.entries(s._byStatus).sort((a, b) => b[1] - a[1])[0][0]
    s.statusColor = REVIEW_STATUSES[dominant].color
    s.statusLabel = REVIEW_STATUSES[dominant].label
    // Revision-time priority: most due first, then fully-reviewed decks, untouched last.
    s.order = s.due > 0 ? -s.due : s._byStatus.reviewed === s.total ? 400 : 500
  }

  // Fuzzy index over every card — tolerates typos, same setup as FeynmanNotes.
  const fuse = useMemo(
    () => new Fuse(items, { keys: ['front', 'back'], threshold: 0.35, ignoreLocation: true }),
    [rawItems], // eslint-disable-line react-hooks/exhaustive-deps -- items is derived 1:1 from rawItems
  )

  // Items of the open discipline (level-2), with optional in-view fuzzy search.
  const q = search.trim()
  const disciplineItems = hubSlug
    ? (q ? fuse.search(q).map((r) => r.item) : items).filter((it) => it.discipline === hubSlug)
    : []
  const disciplineDue = hubSlug ? items.filter((it) => it.discipline === hubSlug && isDue(it)) : []

  const handleAddItem = async () => {
    if (!newItem.content || !newItem.back || !newItem.discipline || saving) return
    setSaving(true)
    const payload = {
      front: newItem.content,
      back: newItem.back,
      discipline: newItem.discipline,
      interval: 1,
      repetition: 0,
      easiness_factor: 2.5,
      next_review_date: new Date().toISOString()
    }
    try {
      const res = await apiFetch(`${API}/spaced-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`create card failed: ${res.status}`)
      mutate(`${API}/spaced-cards`)
      setNewItem({ content: '', back: '', discipline: '' })
      setIsDialogOpen(false)
    } catch (err) {
      console.error('[handleAddItem]', err)
    } finally {
      setSaving(false)
    }
  }

  // Freeze the queue at session start so background mutate() can't drop or reorder cards mid-review.
  const startReviewWith = (cards) => {
    if (!cards.length) return
    sessionStartRef.current = Date.now()
    setReviewQueue([...cards])
    setIsReviewMode(true)
    setCurrentReviewIndex(0)
    setShowAnswer(false)
  }
  const startReview = () => startReviewWith(dueToday)

  // Log the finished session as a completed quest in the task system (Planner/Timer).
  // Real elapsed minutes: task created with target = spent = elapsed → derived-completed.
  const logReviewQuest = async (cardCount) => {
    const minutes = Math.max(1, Math.round((Date.now() - sessionStartRef.current) / 60000))
    const discName = bySlug[hubSlug]?.name ?? 'toutes disciplines'
    try {
      const res = await apiFetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Quête révision — ${discName} (${cardCount} cartes)`,
          target_minutes: minutes,
          category: 'revision',
          scheduled_date: new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) throw new Error(`create quest failed: ${res.status}`)
      const task = await res.json()
      const patch = await apiFetch(`${API}/tasks/${task.id}/add_time`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      })
      if (!patch.ok) throw new Error(`quest add_time failed: ${patch.status}`)
      mutate(`${API}/tasks`)
      mutate(`${API}/tasks/completed`)
    } catch (err) {
      console.error('[logReviewQuest]', err)
    }
  }

  // Award XP once a full session is completed (+5/card, capped at +50).
  const awardSessionXp = async (cardCount) => {
    const amount = Math.min(cardCount * 5, 50)
    if (amount <= 0) return
    try {
      await apiFetch(`${API}/xp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, reason: 'Session révision' }),
      })
      mutate(`${API}/xp/balance`)
    } catch (err) {
      console.error('[awardSessionXp]', err)
    }
  }

  const handleReview = async (quality) => {
    const currentItem = reviewQueue[currentReviewIndex]
    const updated = sm2(currentItem, quality)
    try {
      // POST /review applies the SM-2 update AND records a ReviewLog (vs. the old bare PUT).
      const response = await apiFetch(`${API}/spaced-cards/${currentItem.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quality,
          interval: updated.interval,
          repetition: updated.repetition,
          easiness_factor: updated.easiness_factor,
          next_review_date: updated.next_review_date.toISOString(),
        }),
      })

      if (!response.ok) throw new Error('API review failed')

      mutate(`${API}/spaced-cards`)

      if (currentReviewIndex < reviewQueue.length - 1) {
        setCurrentReviewIndex((prev) => prev + 1)
        setShowAnswer(false)
      } else {
        await awardSessionXp(reviewQueue.length)
        await logReviewQuest(reviewQueue.length)
        setIsReviewMode(false)
        setCurrentReviewIndex(0)
        setShowAnswer(false)
      }
    } catch (err) {
      console.error('[handleReview]', err)
    }
  }

  // ── Review mode UI ──────────────────────────────────────────────────────────
  if (isReviewMode && reviewQueue.length > 0) {
    const currentItem = reviewQueue[currentReviewIndex]
    const config = bySlug[currentItem.discipline] ?? { name: currentItem.discipline, color: '#3B82F6', icon: 'BookOpen' }
    const Icon = resolveIcon(config.icon)
    const progress = ((currentReviewIndex + 1) / reviewQueue.length) * 100

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
        className="min-h-[500px] flex flex-col items-center justify-center px-5 py-6"
      >
        <Card className="glass-strong border-0 w-full max-w-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Repeat className="w-5 h-5 text-emerald-400" />
                Session de révision
              </CardTitle>
              <span className="text-sm text-[var(--color-muted-foreground)]">
                {currentReviewIndex + 1} / {reviewQueue.length}
              </span>
            </div>
            <div className="h-2 bg-[var(--color-secondary)] rounded-full overflow-hidden mt-2">
              <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${config.color}20` }}>
                <Icon className="w-4 h-4" style={{ color: config.color }} />
              </div>
              <span className="text-sm text-[var(--color-muted-foreground)]">{config.name}</span>
            </div>
            <div className="text-center py-6">
              <CodeText text={currentItem.front} className="text-xl font-semibold text-[var(--color-foreground)] mb-4" />
              {!showAnswer ? (
                <Button onClick={() => setShowAnswer(true)} size="lg" className="gap-2">
                  <Brain className="w-5 h-5" />
                  Montrer la réponse
                </Button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                  className="space-y-4"
                >
                  {/* Answer block — rendered before notation buttons */}
                  <div className="rounded-xl bg-[var(--color-secondary)] border border-[var(--color-border)] p-4 text-left">
                    {currentItem.back ? (
                      <CodeText text={currentItem.back} className="text-[15px] text-[var(--color-foreground)]" />
                    ) : (
                      <p className="text-sm text-[var(--color-muted-foreground)] italic">
                        Aucune réponse enregistrée pour cette carte.
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-[var(--color-muted-foreground)]">Comment as-tu trouvé ?</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {qualityLabels.map((q) => (
                      <Button
                        key={q.value}
                        variant="outline"
                        size="sm"
                        onClick={() => handleReview(q.value)}
                        className={cn('gap-1', q.color)}
                      >
                        {q.value === 0 && <XCircle className="w-3 h-3" />}
                        {q.value === 5 && <CheckCircle2 className="w-3 h-3" />}
                        {q.label}
                      </Button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-[var(--color-muted-foreground)]">
              <span className="flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                {currentItem.repetition} révisions
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                Facilité: {currentItem.easiness_factor.toFixed(1)}
              </span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // ── Card row (level-2, inside a knowledge sub-section) ───────────────────────
  const cardRow = (item) => {
    const due = isDue(item)
    const daysUntil = differenceInDays(item.next_review_date, today)
    return (
      <button
        key={item.id}
        onClick={() => { haptic.light(); setActiveCard(item) }}
        className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[var(--color-secondary)] transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-medium text-[var(--color-foreground)] truncate">{item.front}</p>
            {!item.back && (
              <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                Sans réponse
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px]">
            <span className={cn('flex items-center gap-1', due ? 'text-rose-400' : 'text-[var(--color-muted-foreground)]')}>
              <Clock className="w-3 h-3" />
              {due ? 'À réviser' : daysUntil === 1 ? 'Demain' : `Dans ${daysUntil}j`}
            </span>
            <KnowledgeBadges item={item} compact />
          </div>
        </div>
        {item.personal_notes?.trim() && (
          <NotebookPen className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
        )}
        {due && <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />}
        <ChevronRight className="w-4 h-4 text-[var(--color-muted-foreground)] flex-shrink-0" />
      </button>
    )
  }

  const headerDiscipline = hubSlug ? (bySlug[hubSlug] ?? { name: hubSlug, color: '#3B82F6', icon: 'BookOpen' }) : null

  // ── Hub / discipline UI ─────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="space-y-5 px-5 py-4 pb-24"
    >
      {hubSlug === null ? (
        // ─────────── LEVEL 1 — discipline hub ───────────
        <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">Répétition Espacée</h1>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">Choisis une discipline à réviser</p>
            </div>
            <Button variant="outline" className="gap-2 flex-shrink-0" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Ajouter
            </Button>
          </div>

          {dueToday.length > 0 && (
            <Button onClick={startReview} className="w-full gap-2" size="lg">
              <Brain className="w-5 h-5" /> Tout réviser ({dueToday.length})
            </Button>
          )}

          {items.length === 0 ? (
            <Card className="glass border-0">
              <CardContent className="p-10 text-center">
                <Repeat className="w-14 h-14 mx-auto mb-3 opacity-25" />
                <h3 className="text-base font-medium text-[var(--color-foreground)] mb-2">Commence ta collection</h3>
                <p className="text-sm text-[var(--color-muted-foreground)] max-w-xs mx-auto mb-4">
                  L'algorithme SM-2 te fait réviser juste avant que tu n'oublies.
                </p>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" /> Ajouter ma première carte
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DisciplineHub
              disciplines={disciplines}
              stats={hubStats}
              onSelect={(slug) => { setSearch(''); setHubSlug(slug) }}
              emptyLabel="Aucune carte pour l'instant."
            />
          )}
        </>
      ) : (
        // ─────────── LEVEL 2 — discipline view (grouped sub-sections) ───────────
        <>
          <button
            onClick={() => { haptic.light(); setHubSlug(null) }}
            className="flex items-center gap-1 min-h-[40px] -ml-1 text-[14px] font-medium text-[var(--color-muted-foreground)] active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-5 h-5" /> Disciplines
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${headerDiscipline.color}30, ${headerDiscipline.color}10)` }}>
              <DisciplineGlyph discipline={headerDiscipline} size={26} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold tracking-tight text-[var(--color-foreground)] truncate">{headerDiscipline.name}</h1>
              <p className="text-[12px] text-[var(--color-muted-foreground)]">
                {hubStats[hubSlug]?.total ?? 0} cartes · {disciplineDue.length} à réviser
              </p>
            </div>
          </div>

          {disciplineDue.length > 0 && (
            <Button onClick={() => startReviewWith(disciplineDue)} className="w-full gap-2" size="lg">
              <Brain className="w-5 h-5" /> Réviser cette discipline ({disciplineDue.length})
            </Button>
          )}

          {/* In-discipline search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
            <Input
              placeholder="Rechercher dans cette discipline..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {disciplineItems.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-8">Aucune carte ne correspond.</p>
          ) : (
            <KnowledgeSections items={disciplineItems} renderItem={cardRow} />
          )}
        </>
      )}

      {/* ── Create-card dialog (controlled, shared) ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="w-5 h-5 text-emerald-400" />
              Nouvelle carte
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Discipline</label>
              <Select
                value={newItem.discipline}
                onValueChange={(v) => {
                  if (v === ADD_DISCIPLINE) { setNewDisciplineOpen(true); return }
                  setNewItem({ ...newItem, discipline: v })
                }}
              >
                <SelectTrigger><SelectValue placeholder="Choisis une discipline" /></SelectTrigger>
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
                  <SelectItem value={ADD_DISCIPLINE}>
                    <Plus className="w-4 h-4" />
                    Nouvelle discipline
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Question (recto)</label>
              <Textarea
                placeholder="Ex: Qu'est-ce qu'une closure en JavaScript ?"
                value={newItem.content}
                onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Réponse (verso)</label>
              <Textarea
                placeholder="Ex: Une fonction qui capture les variables de son scope lexical."
                value={newItem.back}
                onChange={(e) => setNewItem({ ...newItem, back: e.target.value })}
                className="min-h-[80px]"
              />
            </div>
            <Button
              onClick={handleAddItem}
              className="w-full gap-2"
              disabled={!newItem.content || !newItem.back || !newItem.discipline || saving}
            >
              <Plus className="w-4 h-4" />
              Ajouter à la révision
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline discipline creation — selects the new discipline on the card form */}
      <NewDisciplineDialog
        open={newDisciplineOpen}
        onOpenChange={setNewDisciplineOpen}
        onCreated={(slug) => setNewItem((prev) => ({ ...prev, discipline: slug }))}
      />

      {/* Per-card detail/actions */}
      <CardActionSheet
        open={!!activeCard}
        onClose={() => setActiveCard(null)}
        card={activeCard}
        disciplines={disciplines}
        bySlug={bySlug}
        onReviewNow={(card) => startReviewWith([card])}
      />
    </motion.div>
  )
}
