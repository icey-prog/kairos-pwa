import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import Fuse from 'fuse.js'
import {
  Lightbulb, Plus, Search, BookOpen, Edit3, Sparkles, ChevronRight, ChevronLeft, Timer, NotebookPen,
} from 'lucide-react'
import useSWR, { mutate } from 'swr'
import {
  Card, CardContent,
  Button, Input, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/ui'
import { cn } from '../lib/utils'
import { API, fetcher, apiFetch } from '../lib/api'
import { useDisciplines } from '../hooks/useDisciplines'
import { resolveIcon } from '../lib/disciplineIcons'
import NewDisciplineDialog from './NewDisciplineDialog'
import NoteActionSheet from './NoteActionSheet'
import KnowledgeBadges from './KnowledgeBadges'
import DisciplineHub from './DisciplineHub'
import KnowledgeSections from './KnowledgeSections'
import DisciplineGlyph from './DisciplineGlyph'
import { haptic } from '../lib/haptic'
import { REVIEW_STATUSES } from '../lib/knowledge'
import useStore from '../store/useStore'

const ADD_DISCIPLINE = '__add__'

const getMasteryColor = (level) => {
  if (level >= 80) return 'text-emerald-400'
  if (level >= 60) return 'text-blue-400'
  if (level >= 40) return 'text-amber-400'
  return 'text-rose-400'
}

const EMPTY_NOTE = {
  concept: '',
  simpleExplanation: '',
  analogies: [''],
  gaps: [''],
  refinedExplanation: '',
  discipline: '',
  masteryLevel: 0,
}

export default function FeynmanNotes() {
  const { data: rawNotes } = useSWR(`${API}/feynman`, fetcher, { refreshInterval: 10000 })
  const { disciplines, bySlug, togglePin } = useDisciplines()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [hubSlug, setHubSlug] = useState(null)        // null = discipline hub
  const [search, setSearch] = useState('')
  const [newDisciplineOpen, setNewDisciplineOpen] = useState(false)
  const [activeNote, setActiveNote] = useState(null)
  const [newNote, setNewNote] = useState(EMPTY_NOTE)
  const setActiveTask = useStore((s) => s.setActiveTask)
  const setActiveTab = useStore((s) => s.setActiveTab)

  // "Session d'étude" quest: create a real task for the discipline and hand it to the Timer.
  const startStudySession = async () => {
    const discName = bySlug[hubSlug]?.name ?? hubSlug
    try {
      const res = await apiFetch(`${API}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Étude — ${discName}`,
          target_minutes: 25,
          category: 'etude',
          scheduled_date: new Date().toISOString().slice(0, 10),
        }),
      })
      if (!res.ok) throw new Error(`create study task failed: ${res.status}`)
      const task = await res.json()
      mutate(`${API}/tasks`)
      haptic.light()
      setActiveTask(task)
      setActiveTab('timer')
    } catch (err) {
      console.error('[startStudySession]', err)
    }
  }

  const notes = (rawNotes || []).map((n) => {
    let analogies = []
    let gaps = []
    try { if (n.analogies) analogies = JSON.parse(n.analogies) } catch (_) {}
    try { if (n.gaps) gaps = JSON.parse(n.gaps) } catch (_) {}
    return {
      ...n,
      concept: n.topic,
      simpleExplanation: n.simple_explanation,
      analogies,
      gaps,
      refinedExplanation: n.refined_explanation,
      masteryLevel: n.mastery_level,
    }
  })

  // Per-discipline stats for the hub cards.
  const hubStats = {}
  for (const n of notes) {
    const s = (hubStats[n.discipline] ||= { total: 0, _sum: 0, _byStatus: { not_reviewed: 0, to_review: 0, reviewed: 0 } })
    s.total += 1
    s._sum += n.masteryLevel || 0
    s._byStatus[n.review_status in s._byStatus ? n.review_status : 'not_reviewed'] += 1
  }
  for (const slug in hubStats) {
    const s = hubStats[slug]
    s.sub = `${Math.round(s._sum / s.total)}% maîtrise moy.`
    // Marker = dominant review status; order = started first, untouched next, finished last.
    const dominant = Object.entries(s._byStatus).sort((a, b) => b[1] - a[1])[0][0]
    s.statusColor = REVIEW_STATUSES[dominant].color
    s.statusLabel = REVIEW_STATUSES[dominant].label
    const touched = s._byStatus.to_review + s._byStatus.reviewed
    s.order = touched === 0 ? 1 : s._byStatus.reviewed === s.total ? 2 : 0
  }

  // Fuzzy index over every note — tolerates typos ("revison" → "révision").
  const fuse = useMemo(
    () => new Fuse(notes, {
      keys: ['concept', 'simpleExplanation'],
      threshold: 0.35,
      ignoreLocation: true,
    }),
    [rawNotes], // eslint-disable-line react-hooks/exhaustive-deps -- notes is derived 1:1 from rawNotes
  )

  // Notes of the open discipline (level-2) + in-view fuzzy search,
  // sorted by review status: à réviser → pas encore révisé → révisé.
  const STATUS_SORT = { to_review: 0, not_reviewed: 1, reviewed: 2 }
  const q = search.trim()
  const disciplineNotes = hubSlug
    ? (q ? fuse.search(q).map((r) => r.item) : notes)
        .filter((n) => n.discipline === hubSlug)
        .sort((a, b) =>
          (STATUS_SORT[a.review_status] ?? 1) - (STATUS_SORT[b.review_status] ?? 1))
    : []

  // Existing notes close to the concept being typed in the create dialog.
  const conceptQ = newNote.concept.trim()
  const similarNotes = isDialogOpen && conceptQ.length >= 3
    ? fuse.search(conceptQ).slice(0, 3).map((r) => r.item)
    : []

  const handleSubmit = async () => {
    if (!newNote.discipline || !newNote.concept || !newNote.simpleExplanation) return
    const payload = {
      discipline: newNote.discipline,
      topic: newNote.concept,
      simple_explanation: newNote.simpleExplanation,
      analogies: JSON.stringify(newNote.analogies.filter((a) => a.trim())),
      gaps: JSON.stringify(newNote.gaps.filter((g) => g.trim())),
      refined_explanation: newNote.refinedExplanation,
      mastery_level: newNote.masteryLevel,
    }
    try {
      const res = await apiFetch(`${API}/feynman`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(`create note failed: ${res.status}`)
      mutate(`${API}/feynman`)
      setNewNote(EMPTY_NOTE)
      setIsDialogOpen(false)
    } catch (err) {
      console.error('[handleSubmit]', err)
    }
  }

  const addAnalogy = () => setNewNote({ ...newNote, analogies: [...newNote.analogies, ''] })
  const addGap = () => setNewNote({ ...newNote, gaps: [...newNote.gaps, ''] })
  const updateAnalogy = (i, v) => {
    const a = [...newNote.analogies]; a[i] = v; setNewNote({ ...newNote, analogies: a })
  }
  const updateGap = (i, v) => {
    const g = [...newNote.gaps]; g[i] = v; setNewNote({ ...newNote, gaps: g })
  }

  // ── Note row (level-2, inside a knowledge sub-section) ───────────────────────
  const noteRow = (note) => (
    <button
      key={note.id}
      onClick={() => { haptic.light(); setActiveNote(note) }}
      className="w-full flex items-center gap-3 px-4 py-3 text-left active:bg-[var(--color-secondary)] transition-colors"
    >
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-[var(--color-foreground)] truncate">{note.concept}</p>
        <div className="flex items-center gap-2 mt-1 text-[11px]">
          <span className={cn('font-semibold', getMasteryColor(note.masteryLevel))}>{note.masteryLevel}% maîtrisé</span>
          <KnowledgeBadges item={note} compact />
        </div>
      </div>
      {note.personal_notes?.trim() && (
        <NotebookPen className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
      )}
      <ChevronRight className="w-4 h-4 text-[var(--color-muted-foreground)] flex-shrink-0" />
    </button>
  )

  const headerDiscipline = hubSlug ? (bySlug[hubSlug] ?? { name: hubSlug, color: '#3B82F6', icon: 'BookOpen' }) : null

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
              <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">Notes Feynman</h1>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">Explique simplement pour maîtriser</p>
            </div>
            <Button className="gap-2 flex-shrink-0" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4" /> Note
            </Button>
          </div>

          {notes.length === 0 ? (
            <Card className="glass border-0">
              <CardContent className="p-10 text-center">
                <Lightbulb className="w-14 h-14 mx-auto mb-3 opacity-25" />
                <h3 className="text-base font-medium text-[var(--color-foreground)] mb-2">Commence ta collection Feynman</h3>
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2">
                  <Plus className="w-4 h-4" /> Créer ma première note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <DisciplineHub
              disciplines={disciplines}
              stats={hubStats}
              onSelect={(slug) => { setSearch(''); setHubSlug(slug) }}
              onTogglePin={togglePin}
              emptyLabel="Aucune note pour l'instant."
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
                {hubStats[hubSlug]?.total ?? 0} notes · {hubStats[hubSlug]?.sub ?? ''}
              </p>
            </div>
          </div>

          <Button onClick={startStudySession} className="w-full gap-2">
            <Timer className="w-4 h-4" /> Session d'étude (25 min)
          </Button>

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

          {disciplineNotes.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)] text-center py-8">Aucune note ne correspond.</p>
          ) : (
            <KnowledgeSections items={disciplineNotes} renderItem={noteRow} />
          )}
        </>
      )}

      {/* ── Create-note dialog (controlled, shared) ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-rose-400" />
              Méthode Feynman
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            {/* Discipline */}
            <div>
              <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Discipline</label>
              <Select
                value={newNote.discipline}
                onValueChange={(v) => {
                  if (v === ADD_DISCIPLINE) { setNewDisciplineOpen(true); return }
                  setNewNote({ ...newNote, discipline: v })
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

            {/* Concept */}
            <div>
              <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Concept à maîtriser</label>
              <Input
                placeholder="Ex: Les closures en JavaScript..."
                value={newNote.concept}
                onChange={(e) => setNewNote({ ...newNote, concept: e.target.value })}
              />
              {similarNotes.length > 0 && (
                <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2">
                  <p className="text-[11px] font-semibold text-amber-500 mb-1">Déjà abordé — tape pour ouvrir :</p>
                  {similarNotes.map((n) => (
                    <button
                      key={n.id}
                      type="button"
                      onClick={() => { haptic.light(); setIsDialogOpen(false); setActiveNote(n) }}
                      className="w-full flex items-center justify-between gap-2 py-1.5 text-left active:opacity-70"
                    >
                      <span className="text-[13px] text-[var(--color-foreground)] truncate">
                        {n.concept}
                        <span className="text-[var(--color-muted-foreground)]"> · {bySlug[n.discipline]?.name ?? n.discipline}</span>
                      </span>
                      <span className={cn('text-[12px] font-semibold flex-shrink-0', getMasteryColor(n.masteryLevel))}>
                        {n.masteryLevel}%
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Step 1 */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2 text-[var(--color-foreground)]">
                <Edit3 className="w-4 h-4 text-blue-400" />
                Étape 1 : Explique comme à un enfant
              </label>
              <Textarea
                placeholder="Utilise des mots simples, pas de jargon..."
                value={newNote.simpleExplanation}
                onChange={(e) => setNewNote({ ...newNote, simpleExplanation: e.target.value })}
                className="min-h-[90px]"
              />
            </div>

            {/* Analogies */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2 text-[var(--color-foreground)]">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Étape 2 : Analogies (optionnel)
              </label>
              {newNote.analogies.map((a, i) => (
                <div key={i} className="mb-2">
                  <Input placeholder={`Analogie ${i + 1}...`} value={a} onChange={(e) => updateAnalogy(i, e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addAnalogy} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Ajouter une analogie
              </Button>
            </div>

            {/* Gaps */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2 text-[var(--color-foreground)]">
                <Search className="w-4 h-4 text-rose-400" />
                Étape 3 : Lacunes (optionnel)
              </label>
              {newNote.gaps.map((g, i) => (
                <div key={i} className="mb-2">
                  <Input placeholder={`Lacune ${i + 1}...`} value={g} onChange={(e) => updateGap(i, e.target.value)} />
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addGap} className="w-full">
                <Plus className="w-4 h-4 mr-2" /> Ajouter une lacune
              </Button>
            </div>

            {/* Refined explanation */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-2 text-[var(--color-foreground)]">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                Étape 4 : Explication raffinée (optionnel)
              </label>
              <Textarea
                placeholder="Après avoir comblé les lacunes, réécris..."
                value={newNote.refinedExplanation}
                onChange={(e) => setNewNote({ ...newNote, refinedExplanation: e.target.value })}
                className="min-h-[70px]"
              />
            </div>

            {/* Mastery slider */}
            <div>
              <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Niveau de maîtrise estimé</label>
              <input
                type="range" min="0" max="100"
                value={newNote.masteryLevel}
                onChange={(e) => setNewNote({ ...newNote, masteryLevel: parseInt(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-[var(--color-muted-foreground)] mt-1">
                <span>Débutant</span>
                <span className={getMasteryColor(newNote.masteryLevel)}>{newNote.masteryLevel}%</span>
                <span>Expert</span>
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              className="w-full gap-2"
              disabled={!newNote.discipline || !newNote.concept || !newNote.simpleExplanation}
            >
              <Lightbulb className="w-4 h-4" />
              Enregistrer la note
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline discipline creation — selects the new discipline on the note form */}
      <NewDisciplineDialog
        open={newDisciplineOpen}
        onOpenChange={setNewDisciplineOpen}
        onCreated={(slug) => setNewNote((prev) => ({ ...prev, discipline: slug }))}
      />

      {/* Per-note detail/actions */}
      <NoteActionSheet
        open={!!activeNote}
        onClose={() => setActiveNote(null)}
        note={activeNote}
        disciplines={disciplines}
        bySlug={bySlug}
        onNext={(() => {
          const i = disciplineNotes.findIndex((n) => n.id === activeNote?.id)
          return i >= 0 && i < disciplineNotes.length - 1 ? () => setActiveNote(disciplineNotes[i + 1]) : null
        })()}
        onPrev={(() => {
          const i = disciplineNotes.findIndex((n) => n.id === activeNote?.id)
          return i > 0 ? () => setActiveNote(disciplineNotes[i - 1]) : null
        })()}
      />
    </motion.div>
  )
}
