import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Repeat, Plus, Brain, Clock, CheckCircle2, XCircle, AlertCircle,
  Calendar, TrendingUp, Code2, Palette, BookOpen, RotateCcw,
} from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import useSWR, { mutate } from 'swr'
import {
  Card, CardContent, CardHeader, CardTitle,
  Button, Textarea, Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/ui'
import { cn } from '../lib/utils'
import { DISCIPLINE_CONFIG } from '../lib/types'
import { API, fetcher } from '../lib/api'

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
const getDisciplineIcon = (id) => {
  if (id === 'coding') return Code2
  if (id === 'exolab') return Brain
  if (id === 'design') return Palette
  return BookOpen
}

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isReviewMode, setIsReviewMode] = useState(false)
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [newItem, setNewItem] = useState({ content: '', discipline: '' })

  const items = (rawItems || []).map(i => ({ ...i, next_review_date: parseISO(i.next_review_date) }))
  const today = new Date()
  const dueToday = items.filter((item) => differenceInDays(today, item.next_review_date) >= 0)
  const upcoming = items.filter((item) => {
    const d = differenceInDays(item.next_review_date, today)
    return d > 0 && d <= 7
  })
  const mastered = items.filter((item) => item.repetition >= 5)

  const handleAddItem = async () => {
    if (!newItem.content || !newItem.discipline) return
    const payload = {
      front: newItem.content,
      back: '',
      discipline: newItem.discipline,
      interval: 1,
      repetition: 0,
      easiness_factor: 2.5,
      next_review_date: new Date().toISOString()
    }
    try {
      await fetch(`${API}/spaced-cards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      mutate(`${API}/spaced-cards`)
    } catch (_) {}
    setNewItem({ content: '', discipline: '' })
    setIsDialogOpen(false)
  }

  const startReview = () => {
    if (dueToday.length === 0) return
    setIsReviewMode(true)
    setCurrentReviewIndex(0)
    setShowAnswer(false)
  }

  const handleReview = async (quality) => {
    const currentItem = dueToday[currentReviewIndex]
    const updated = sm2(currentItem, quality)
    try {
      await fetch(`${API}/spaced-cards/${currentItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interval: updated.interval,
          repetition: updated.repetition,
          easiness_factor: updated.easiness_factor,
          next_review_date: updated.next_review_date.toISOString(),
        }),
      })
      mutate(`${API}/spaced-cards`)
    } catch (_) {}

    if (currentReviewIndex < dueToday.length - 1) {
      setCurrentReviewIndex((prev) => prev + 1)
      setShowAnswer(false)
    } else {
      setIsReviewMode(false)
      setCurrentReviewIndex(0)
      setShowAnswer(false)
    }
  }

  // ── Review mode UI ──────────────────────────────────────────────────────────
  if (isReviewMode && dueToday.length > 0) {
    const currentItem = dueToday[currentReviewIndex]
    const config = DISCIPLINE_CONFIG[currentItem.discipline]
    const Icon = getDisciplineIcon(currentItem.discipline)
    const progress = ((currentReviewIndex + 1) / dueToday.length) * 100

    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
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
                {currentReviewIndex + 1} / {dueToday.length}
              </span>
            </div>
            <div className="h-2 bg-[var(--color-secondary)] rounded-full overflow-hidden mt-2">
              <motion.div
                className="h-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
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
                  <Select value={newItem.discipline} onValueChange={(v) => setNewItem({ ...newItem, discipline: v })}>
                    <SelectTrigger><SelectValue placeholder="Choisis une discipline" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(DISCIPLINE_CONFIG).map(([id, cfg]) => {
                        const Icon = getDisciplineIcon(id)
                        return (
                          <SelectItem key={id} value={id}>
                            <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                            {cfg.name}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Contenu à mémoriser</label>
                  <Textarea
                    placeholder="Ex: Qu'est-ce qu'une closure en JavaScript ?"
                    value={newItem.content}
                    onChange={(e) => setNewItem({ ...newItem, content: e.target.value })}
                    className="min-h-[100px]"
                  />
                </div>
                <Button
                  onClick={handleAddItem}
                  className="w-full gap-2"
                  disabled={!newItem.content || !newItem.discipline}
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

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { count: dueToday.length,  label: 'À réviser',       Icon: AlertCircle, color: 'text-rose-400',    bg: 'bg-rose-500/20' },
          { count: upcoming.length,  label: 'Cette semaine',   Icon: Calendar,    color: 'text-amber-400',   bg: 'bg-amber-500/20' },
          { count: mastered.length,  label: 'Maîtrisés',       Icon: CheckCircle2,color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { count: items.length,     label: 'Total cartes',    Icon: Repeat,      color: 'text-blue-400',    bg: 'bg-blue-500/20' },
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
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {items.map((item) => {
            const Icon = getDisciplineIcon(item.discipline)
            const config = DISCIPLINE_CONFIG[item.discipline]
            const isDue = differenceInDays(today, item.nextReview) >= 0
            const daysUntil = differenceInDays(item.nextReview, today)
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  'glass rounded-xl p-4 border-0 card-hover',
                  isDue && 'ring-2 ring-rose-500/50',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: `${config.color}20` }}>
                    <Icon className="w-5 h-5" style={{ color: config.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-[var(--color-foreground)] truncate">{item.front}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs">
                      <span className={cn('flex items-center gap-1', isDue ? 'text-rose-400' : 'text-[var(--color-muted-foreground)]')}>
                        <Clock className="w-3 h-3" />
                        {isDue ? 'À réviser' : daysUntil === 1 ? 'Demain' : `Dans ${daysUntil}j`}
                      </span>
                      <span className="text-[var(--color-muted-foreground)] flex items-center gap-1">
                        <RotateCcw className="w-3 h-3" />
                        {item.repetition}x
                      </span>
                    </div>
                  </div>
                  {isDue && <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}
