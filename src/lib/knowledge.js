import { BookOpen, Layers, Lightbulb, Zap, Target, Bug } from 'lucide-react'

// Knowledge taxonomy mirrors the backend SpacedCard / FeynmanNote fields:
//   level              : beginner | intermediate | expert        (difficulty)
//   knowledge_category : base_concept | fundamental | tip_trick |
//                        advantage | cheat_code | bug_fix         (type of knowledge)
// Both nullable — legacy cards have null → no badge.

export const LEVELS = {
  beginner:     { label: 'Débutant',      color: '#22C55E' },
  intermediate: { label: 'Intermédiaire', color: '#F59E0B' },
  expert:       { label: 'Expert',        color: '#EF4444' },
}

// Lucide icons instead of the emojis in the spec — consistent with the app aesthetic.
export const CATEGORIES = {
  base_concept: { label: 'Base',        Icon: BookOpen,  color: '#3B82F6' },
  fundamental:  { label: 'Fondamental', Icon: Layers,    color: '#8B5CF6' },
  tip_trick:    { label: 'Tip',         Icon: Lightbulb, color: '#F59E0B' },
  advantage:    { label: 'Avantage',    Icon: Zap,       color: '#10B981' },
  cheat_code:   { label: 'Cheat',       Icon: Target,    color: '#EC4899' },
  bug_fix:      { label: 'Bug Fix',     Icon: Bug,       color: '#EF4444' },
}

export const levelMeta = (level) => LEVELS[level] ?? null
export const categoryMeta = (cat) => CATEGORIES[cat] ?? null

// Ordered lists for filter UIs.
export const LEVEL_FILTERS = [
  { id: 'beginner',     label: 'Débutant' },
  { id: 'intermediate', label: 'Intermédiaire' },
  { id: 'expert',       label: 'Expert' },
]
