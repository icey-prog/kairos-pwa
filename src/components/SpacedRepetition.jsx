import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Repeat, Plus, Brain, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, TrendingUp, Search, RotateCcw, ChevronRight,
} from 'lucide-react'
import { differenceInDays, parseISO, isAfter, startOfDay } from 'date-fns'
import useSWR, { mutate } from 'swr'
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Input, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/ui'
import { cn } from '../lib/utils'
import { API, fetcher, apiFetch } from '../lib/api'
import { haptic } from '../lib/haptic'
import useStore from '../store/useStore'
import { useDisciplines } from '../hooks/useDisciplines'
import { resolveIcon } from '../lib/disciplineIcons'
import DisciplineChips from './DisciplineChips'
import NewDisciplineDialog from './NewDisciplineDialog'
import CardActionSheet from './CardActionSheet'
import KnowledgeBadges from './KnowledgeBadges'

const ADD_DISCIPLINE = '__add__'   // sentinel value for the "+ Nouvelle discipline" select entry

const STATUS_FILTERS = [
  { id: 'all',      label: 'Toutes' },
  { id: 'due',      label: 'À réviser' },
  { id: 'week',     label: 'Cette semaine' },
  { id: 'mastered', label: 'Maîtrisées' },
]

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
  const openDiscipline = useStore((s) => s.openDiscipline)
  const pendingReviewSlug = useStore((s) => s.pendingReviewSlug)
  const setPendingReviewSlug = useStore((s) => s.setPendingReviewSlug)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [reviewQueue, setReviewQueue] = useState([])      // snapshot — frozen at session start
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [newItem, setNewItem] = useState({ content: '', back: '', discipline: '' })
  const [saving, setSaving] = useState(false)
  // Filters
  const [disciplineFilter, setDisciplineFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [newDisciplineOpen, setNewDisciplineOpen] = useState(false)
  const [activeCard, setActiveCard] = useState(null)   // card whose action sheet is open

  const today = new Date()
  const items = (rawItems || []).map(i => ({ ...i, next_review_date: parseISO(i.next_review_date) }))

  // dueToday drives the review CTA — always the full due set, independent of UI filters.
  const dueToday = items.filter((item) => isCardDue(item.next_review_date, today))

  // Per-discipline counts for the chips.
  const counts = items.reduce((acc, item) => {
    acc.all = (acc.all || 0) + 1
    acc[item.discipline] = (acc[item.discipline] || 0) + 1
    return acc
  }, {})

  // Apply discipline + status + search filters for the list view and its stats.
  const matchesStatus = (item) => {
    if (statusFilter === 'due') return isCardDue(item.next_review_date, today)
    if (statusFilter === 'week') {
      const d = differenceInDays(item.next_review_date, today)
      return d > 0 && d <= 7
    }
    if (statusFilter === 'mastered') return item.repetition >= 5
    return true
  }
  const q = search.trim().toLowerCase()
  const filtered = items.filter((item) => {
    if (disciplineFilter !== 'all' && item.discipline !== disciplineFilter) return false
    if (!matchesStatus(item)) return false
    if (q && !(`${item.front} ${item.back || ''}`.toLowerCase().includes(q))) return false
    return true
  })

  // Stats recompute on the filtered set.
  const statDue = filtered.filter((item) => isCardDue(item.next_review_date, today)).length
  const statWeek = filtered.filter((item) => {
    const d = differenceInDays(item.next_review_date, today)
    return d > 0 && d <= 7
  }).length
  const statMastered = filtered.filter((item) => item.repetition >= 5).length

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
    setReviewQueue([...cards])
    setIsReviewMode(true)
    setCurrentReviewIndex(0)
    setShowAnswer(false)
  }
  const startReview = () => startReviewWith(dueToday)

  // DisciplineDetail CTA → auto-start a filtered review when we land on this tab.
  useEffect(() => {
    if (!pendingReviewSlug) return
    setDisciplineFilter(pendingReviewSlug)
    const due = items.filter((c) => c.discipline === pendingReviewSlug && isCardDue(c.next_review_date, today))
    if (due.length) startReviewWith(due)
    setPendingReviewSlug(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingReviewSlug, rawItems])

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
              <h3 className="text-xl font-semibold text-[var(--color-foreground)] mb-4">{currentItem.front}</h3>
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
                      <p className="text-[15px] text-[var(--color-foreground)] whitespace-pre-wrap leading-relaxed">
                        {currentItem.back}
                      </p>
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

  // ── List mode UI ────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', damping: 26, stiffness: 260 }}
      className="space-y-5 px-5 py-4 pb-24"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">Répétition Espacée</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
            Révise au moment optimal
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </DialogTrigger>
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

          <Button onClick={startReview} disabled={dueToday.length === 0} className="gap-2">
            <Brain className="w-4 h-4" />
            Réviser ({dueToday.length})
          </Button>
        </div>
      </div>

      {/* Stats — recomputed on the filtered set */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { count: statDue,           label: 'À réviser',     Icon: AlertCircle, color: 'text-rose-400',    bg: 'bg-rose-500/20' },
          { count: statWeek,          label: 'Cette semaine', Icon: Calendar,    color: 'text-amber-400',   bg: 'bg-amber-500/20' },
          { count: statMastered,      label: 'Maîtrisés',     Icon: CheckCircle2,color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { count: filtered.length,   label: 'Total cartes',  Icon: Repeat,      color: 'text-blue-400',    bg: 'bg-blue-500/20' },
        ].map(({ count, label, Icon, color, bg }) => (
          <Card key={label} className="glass border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--color-foreground)]">{count}</p>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Discipline filter chips */}
      <DisciplineChips
        disciplines={disciplines}
        selected={disciplineFilter}
        onSelect={setDisciplineFilter}
        counts={counts}
      />

      {/* Open the full Formation view for the selected discipline */}
      {disciplineFilter !== 'all' && bySlug[disciplineFilter] && (
        <button
          onClick={() => { haptic.light(); openDiscipline(disciplineFilter) }}
          className="w-full flex items-center justify-between min-h-[44px] px-4 rounded-xl glass border-0 active:scale-[0.98] transition-transform"
        >
          <span className="text-[13px] font-semibold text-[var(--color-foreground)]">
            Ouvrir la formation · {bySlug[disciplineFilter].name}
          </span>
          <ChevronRight className="w-4 h-4 text-[var(--color-muted-foreground)]" />
        </button>
      )}

      {/* Status segmented control */}
      <div className="flex gap-1.5 p-1 rounded-xl bg-[var(--color-secondary)]">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s.id}
            onClick={() => setStatusFilter(s.id)}
            className={cn(
              'flex-1 min-h-[36px] rounded-lg text-[12px] font-semibold transition-all active:scale-[0.97]',
              statusFilter === s.id
                ? 'bg-[var(--color-background)] text-[var(--color-foreground)] shadow-sm'
                : 'text-[var(--color-muted-foreground)]',
            )}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
        <Input
          placeholder="Rechercher une carte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Cards list */}
      {items.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="p-10 text-center">
            <Repeat className="w-14 h-14 mx-auto mb-3 opacity-25" />
            <h3 className="text-base font-medium text-[var(--color-foreground)] mb-2">Commence ta collection</h3>
            <p className="text-sm text-[var(--color-muted-foreground)] max-w-xs mx-auto mb-4">
              L'algorithme SM-2 te fait réviser juste avant que tu n'oublies.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Ajouter ma première carte
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="glass border-0">
          <CardContent className="p-10 text-center">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-25" />
            <p className="text-sm text-[var(--color-muted-foreground)]">Aucune carte ne correspond aux filtres.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filtered.map((item) => {
            const config = bySlug[item.discipline] ?? { color: '#3B82F6', icon: 'BookOpen' }
            const Icon = resolveIcon(config.icon)
            const isDue = isCardDue(item.next_review_date, today)
            const daysUntil = differenceInDays(item.next_review_date, today)
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                onClick={() => { haptic.light(); setActiveCard(item) }}
                className={cn(
                  'glass rounded-xl p-4 border-0 card-hover cursor-pointer active:scale-[0.98] transition-transform',
                  isDue && 'ring-2 ring-rose-500/50',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${config.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-[var(--color-foreground)] truncate">{item.front}</p>
                      {!item.back && (
                        <span className="flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500">
                          Sans réponse
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className={cn('flex items-center gap-1', isDue ? 'text-rose-400' : 'text-[var(--color-muted-foreground)]')}>
                        <Clock className="w-3 h-3" />
                        {isDue ? 'À réviser' : daysUntil === 1 ? 'Demain' : `Dans ${daysUntil}j`}
                      </span>
                      <span className="text-[var(--color-muted-foreground)] flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        {item.repetition}x
                      </span>
                      <KnowledgeBadges item={item} compact />
                    </div>
                  </div>
                  {isDue && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Inline discipline creation — selects the new discipline on the card form */}
      <NewDisciplineDialog
        open={newDisciplineOpen}
        onOpenChange={setNewDisciplineOpen}
        onCreated={(slug) => setNewItem((prev) => ({ ...prev, discipline: slug }))}
      />

      {/* Per-card contextual actions */}
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
