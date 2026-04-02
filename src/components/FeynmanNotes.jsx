import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lightbulb, Plus, Search, BookOpen, Code2, Brain, Palette,
  Star, Edit3, Sparkles, ChevronDown, ChevronUp, XCircle,
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import useSWR, { mutate } from 'swr'
import {
  Card, CardContent, Badge,
  Button, Input, Textarea,
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../lib/ui'
import { cn } from '../lib/utils'
import { DISCIPLINE_CONFIG } from '../lib/types'
import { API, fetcher } from '../lib/api'

// No localStorage loading anymore

const getDisciplineIcon = (id) => {
  if (id === 'coding') return Code2
  if (id === 'exolab') return Brain
  if (id === 'design') return Palette
  return BookOpen
}

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
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [expandedNote, setExpandedNote] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDiscipline, setSelectedDiscipline] = useState('all')
  const [newNote, setNewNote] = useState(EMPTY_NOTE)

  const notes = (rawNotes || []).map((n) => {
    let analogies = []
    let gaps = []
    
    try {
      if (n.analogies) analogies = JSON.parse(n.analogies)
    } catch (_) {}
    
    try {
      if (n.gaps) gaps = JSON.parse(n.gaps)
    } catch (_) {}

    return {
      ...n,
      concept: n.topic,
      simpleExplanation: n.simple_explanation,
      analogies,
      gaps,
      refinedExplanation: n.refined_explanation,
      masteryLevel: n.mastery_level,
      createdAt: parseISO(n.created_at),
    }
  })

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
      await fetch(`${API}/feynman`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      mutate(`${API}/feynman`)
    } catch (_) {}
    setNewNote(EMPTY_NOTE)
    setIsDialogOpen(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Supprimer cette note ?')) return
    try {
      await fetch(`${API}/feynman/${id}`, { method: 'DELETE' })
      mutate(`${API}/feynman`)
    } catch (_) {}
  }

  const addAnalogy = () => setNewNote({ ...newNote, analogies: [...newNote.analogies, ''] })
  const addGap = () => setNewNote({ ...newNote, gaps: [...newNote.gaps, ''] })
  const updateAnalogy = (i, v) => {
    const a = [...newNote.analogies]; a[i] = v; setNewNote({ ...newNote, analogies: a })
  }
  const updateGap = (i, v) => {
    const g = [...newNote.gaps]; g[i] = v; setNewNote({ ...newNote, gaps: g })
  }

  const filtered = notes.filter((n) => {
    const matchSearch = n.concept.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.simpleExplanation.toLowerCase().includes(searchQuery.toLowerCase())
    const matchDiscipline = selectedDiscipline === 'all' || n.discipline === selectedDiscipline
    return matchSearch && matchDiscipline
  })

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
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">Notes Feynman</h1>
          <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">Explique simplement pour maîtriser</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Nouvelle note
            </Button>
          </DialogTrigger>
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
                <Select value={newNote.discipline} onValueChange={(v) => setNewNote({ ...newNote, discipline: v })}>
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

              {/* Concept */}
              <div>
                <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Concept à maîtriser</label>
                <Input
                  placeholder="Ex: Les closures en JavaScript..."
                  value={newNote.concept}
                  onChange={(e) => setNewNote({ ...newNote, concept: e.target.value })}
                />
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
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { count: notes.length, label: 'Notes Feynman',     Icon: Lightbulb, color: 'text-rose-400',    bg: 'bg-rose-500/20' },
          { count: notes.reduce((a, n) => a + n.analogies.length, 0), label: 'Analogies', Icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { count: notes.length > 0 ? Math.round(notes.reduce((a, n) => a + n.masteryLevel, 0) / notes.length) : 0, label: '% Maîtrise moy.',  Icon: Star,     color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { count: new Set(notes.map((n) => n.discipline)).size, label: 'Disciplines',    Icon: BookOpen, color: 'text-blue-400',    bg: 'bg-blue-500/20' },
        ].map(({ count, label, Icon, color, bg }) => (
          <Card key={label} className="glass border-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', bg)}>
                <Icon className={cn('w-5 h-5', color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-[var(--color-foreground)]">
                  {typeof count === 'number' && label.includes('%') ? `${count}%` : count}
                </p>
                <p className="text-[11px] text-[var(--color-muted-foreground)]">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-muted-foreground)]" />
          <Input
            placeholder="Rechercher un concept..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedDiscipline} onValueChange={setSelectedDiscipline}>
          <SelectTrigger className="sm:w-48">
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les disciplines</SelectItem>
            {Object.entries(DISCIPLINE_CONFIG).map(([id, cfg]) => (
              <SelectItem key={id} value={id}>{cfg.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notes list */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="glass border-0">
            <CardContent className="p-10 text-center">
              <Lightbulb className="w-14 h-14 mx-auto mb-3 opacity-25" />
              <h3 className="text-base font-medium text-[var(--color-foreground)] mb-2">
                {notes.length === 0 ? 'Commence ta collection Feynman' : 'Aucun résultat'}
              </h3>
              {notes.length === 0 && (
                <Button onClick={() => setIsDialogOpen(true)} className="gap-2 mt-2">
                  <Plus className="w-4 h-4" />
                  Créer ma première note
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <AnimatePresence>
            {filtered.map((note) => {
              const Icon = getDisciplineIcon(note.discipline)
              const config = DISCIPLINE_CONFIG[note.discipline]
              const isExpanded = expandedNote === note.id
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 20, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                >
                  <Card className="glass border-0 card-hover overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: `linear-gradient(135deg, ${config.color}30, ${config.color}10)` }}
                        >
                          <Icon className="w-5 h-5" style={{ color: config.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-[var(--color-foreground)]">{note.concept}</h3>
                              <Badge variant="secondary" className={getMasteryColor(note.masteryLevel)}>
                                {note.masteryLevel}% maîtrisé
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-[var(--color-muted-foreground)] flex-shrink-0">
                                {format(note.createdAt, 'dd MMM', { locale: fr })}
                              </span>
                              <Button variant="ghost" size="xs" onClick={() => handleDelete(note.id)} className="h-6 w-6 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-500/10">
                                <XCircle className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 p-3 rounded-lg bg-[var(--color-secondary)]/50">
                            <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Explication simple:</p>
                            <p className="text-sm text-[var(--color-foreground)]">{note.simpleExplanation}</p>
                          </div>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                                className="overflow-hidden"
                              >
                                {note.analogies.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Analogies:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {note.analogies.map((a, i) => (
                                        <span key={i} className="text-xs px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">{a}</span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                {note.gaps.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Lacunes:</p>
                                    <ul className="space-y-1">
                                      {note.gaps.map((g, i) => (
                                        <li key={i} className="text-sm text-rose-400 flex items-center gap-2">
                                          <span className="w-1 h-1 rounded-full bg-rose-400" />{g}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {note.refinedExplanation && (
                                  <div className="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                    <p className="text-xs text-[var(--color-muted-foreground)] mb-1">Explication raffinée:</p>
                                    <p className="text-sm text-[var(--color-foreground)]">{note.refinedExplanation}</p>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedNote(isExpanded ? null : note.id)}
                            className="mt-2"
                          >
                            {isExpanded
                              ? <><ChevronUp className="w-4 h-4 mr-1" />Voir moins</>
                              : <><ChevronDown className="w-4 h-4 mr-1" />Voir plus</>}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}
