import { useState } from 'react'
import useSWR from 'swr'
import { motion } from 'framer-motion'
import { parseISO, differenceInDays, isAfter, startOfDay } from 'date-fns'
import { ChevronLeft, Brain, Repeat, Lightbulb, AlertCircle, Star, Clock } from 'lucide-react'
import { Button } from '../lib/ui'
import useStore from '../store/useStore'
import { API, fetcher } from '../lib/api'
import { useDisciplines } from '../hooks/useDisciplines'
import { resolveIcon } from '../lib/disciplineIcons'
import { haptic } from '../lib/haptic'
import { cn } from '../lib/utils'
import CardActionSheet from './CardActionSheet'
import NoteActionSheet from './NoteActionSheet'

const isCardDue = (d, today = new Date()) => !isAfter(startOfDay(d), startOfDay(today))

// Formation view for one discipline — stats + its cards & notes. Rendered over the
// main views (which stay mounted), so the Pomodoro timer keeps running underneath.
export default function DisciplineDetail() {
  const slug = useStore((s) => s.activeDisciplineSlug)
  const closeDiscipline = useStore((s) => s.closeDiscipline)
  const setMainTab = useStore((s) => s.setMainTab)
  const setActiveTab = useStore((s) => s.setActiveTab)
  const setPendingReviewSlug = useStore((s) => s.setPendingReviewSlug)

  const { bySlug } = useDisciplines()
  const discipline = slug ? bySlug[slug] : null

  const { data: stats } = useSWR(
    discipline?.id ? `${API}/disciplines/${discipline.id}/stats` : null,
    fetcher,
  )
  const { data: rawCards } = useSWR(`${API}/spaced-cards`, fetcher, { refreshInterval: 10000 })
  const { data: rawNotes } = useSWR(`${API}/feynman`, fetcher, { refreshInterval: 10000 })

  const [activeCard, setActiveCard] = useState(null)
  const [activeNote, setActiveNote] = useState(null)

  if (!discipline) return null
  const Icon = resolveIcon(discipline.icon)
  const color = discipline.color || '#3B82F6'
  const today = new Date()

  const cards = (rawCards || [])
    .filter((c) => c.discipline === slug)
    .map((c) => ({ ...c, next_review_date: parseISO(c.next_review_date) }))

  const notes = (rawNotes || [])
    .filter((n) => n.discipline === slug)
    .map((n) => {
      let analogies = [], gaps = []
      try { if (n.analogies) analogies = JSON.parse(n.analogies) } catch (_) {}
      try { if (n.gaps) gaps = JSON.parse(n.gaps) } catch (_) {}
      return {
        ...n, concept: n.topic, simpleExplanation: n.simple_explanation,
        analogies, gaps, refinedExplanation: n.refined_explanation, masteryLevel: n.mastery_level,
      }
    })

  const dueCount = cards.filter((c) => isCardDue(c.next_review_date, today)).length
  const masteredPct = stats?.cards_total
    ? Math.round((stats.cards_mastered / stats.cards_total) * 100)
    : 0

  const back = () => { haptic.light(); closeDiscipline() }

  // CTA → switch to flashcards tab and signal an auto-started, discipline-filtered review.
  const reviewDiscipline = () => {
    haptic.medium()
    setPendingReviewSlug(slug)
    setMainTab('learn')
    setActiveTab('sr')
    closeDiscipline()
  }

  const STAT_TILES = [
    { Icon: AlertCircle, label: 'À réviser',     value: dueCount,                       color: 'text-rose-400',    bg: 'bg-rose-500/20' },
    { Icon: Star,        label: '% maîtrisé',    value: `${masteredPct}%`,              color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    { Icon: Lightbulb,   label: 'Maîtrise notes',value: `${stats?.avg_mastery ?? 0}%`,  color: 'text-amber-400',   bg: 'bg-amber-500/20' },
    { Icon: Repeat,      label: 'Total cartes',  value: stats?.cards_total ?? cards.length, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-40 bg-[var(--color-background)] overflow-y-auto pb-24"
    >
      {/* Header */}
      <div className="px-5 pt-5">
        <button
          onClick={back}
          className="flex items-center gap-1 min-h-[40px] text-[14px] font-medium text-[var(--color-muted-foreground)] active:scale-95 transition-transform -ml-1 mb-4"
        >
          <ChevronLeft className="w-5 h-5" /> Retour
        </button>

        <div className="flex items-start gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${color}30, ${color}10)` }}
          >
            <Icon className="w-7 h-7" style={{ color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)] leading-tight">{discipline.name}</h1>
            {discipline.description && (
              <p className="text-sm text-[var(--color-muted-foreground)] mt-1 leading-relaxed">{discipline.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-5 mt-5 grid grid-cols-2 gap-3">
        {STAT_TILES.map(({ Icon: TileIcon, label, value, color: c, bg }) => (
          <div key={label} className="glass border-0 rounded-xl p-4 flex items-center gap-3">
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
              <TileIcon className={cn('w-5 h-5', c)} />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--color-foreground)]">{value}</p>
              <p className="text-[11px] text-[var(--color-muted-foreground)]">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA — single focal action */}
      <div className="px-5 mt-5">
        <Button onClick={reviewDiscipline} disabled={dueCount === 0} className="w-full gap-2" size="lg">
          <Brain className="w-5 h-5" />
          {dueCount > 0 ? `Réviser cette discipline (${dueCount})` : 'Rien à réviser pour l\'instant'}
        </Button>
      </div>

      {/* Cards section */}
      <Section title="Cartes" count={cards.length} icon={Repeat} color={color}>
        {cards.length === 0 ? (
          <Empty label="Aucune carte dans cette discipline." />
        ) : (
          cards
            .sort((a, b) => a.next_review_date - b.next_review_date)
            .map((card) => {
              const due = isCardDue(card.next_review_date, today)
              const days = differenceInDays(card.next_review_date, today)
              return (
                <button
                  key={card.id}
                  onClick={() => { haptic.light(); setActiveCard(card) }}
                  className={cn(
                    'w-full text-left glass rounded-xl p-3.5 border-0 active:scale-[0.98] transition-transform flex items-center gap-3',
                    due && 'ring-2 ring-rose-500/40',
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{card.front}</p>
                    <span className={cn('text-xs flex items-center gap-1 mt-0.5', due ? 'text-rose-400' : 'text-[var(--color-muted-foreground)]')}>
                      <Clock className="w-3 h-3" />
                      {due ? 'À réviser' : days === 1 ? 'Demain' : `Dans ${days}j`}
                    </span>
                  </div>
                  {!card.back && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-500 flex-shrink-0">
                      Sans réponse
                    </span>
                  )}
                </button>
              )
            })
        )}
      </Section>

      {/* Notes section */}
      <Section title="Notes Feynman" count={notes.length} icon={Lightbulb} color={color}>
        {notes.length === 0 ? (
          <Empty label="Aucune note dans cette discipline." />
        ) : (
          notes.map((note) => (
            <button
              key={note.id}
              onClick={() => { haptic.light(); setActiveNote(note) }}
              className="w-full text-left glass rounded-xl p-3.5 border-0 active:scale-[0.98] transition-transform flex items-center gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--color-foreground)] truncate">{note.concept}</p>
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">{note.masteryLevel}% maîtrisé</p>
              </div>
            </button>
          ))
        )}
      </Section>

      {/* Reused contextual sheets */}
      <CardActionSheet
        open={!!activeCard}
        onClose={() => setActiveCard(null)}
        card={activeCard}
        disciplines={Object.values(bySlug)}
        bySlug={bySlug}
        onReviewNow={() => reviewDiscipline()}
      />
      <NoteActionSheet
        open={!!activeNote}
        onClose={() => setActiveNote(null)}
        note={activeNote}
        disciplines={Object.values(bySlug)}
        bySlug={bySlug}
      />
    </motion.div>
  )
}

function Section({ title, count, icon: Icon, color, children }) {
  return (
    <div className="px-5 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color }} />
        <h2 className="text-[15px] font-bold text-[var(--color-foreground)]">{title}</h2>
        <span className="text-[12px] text-[var(--color-muted-foreground)]">{count}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  )
}

function Empty({ label }) {
  return <p className="text-sm text-[var(--color-muted-foreground)] py-4 text-center">{label}</p>
}
