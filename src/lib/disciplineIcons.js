import {
  Code2, Brain, Palette, Server, Monitor, Database, Box, GitBranch,
  Network, Shield, Radio, FlaskConical, BookOpen, Cpu, Globe, Layers,
  Terminal, Cloud, Lock, Zap,
} from 'lucide-react'

// Static allow-list of Lucide icons usable by disciplines.
// A wildcard `import * as icons` would pull the whole lib into the bundle (+600KB).
// Backend stores the icon NAME as a string; we resolve it here.
const ICON_MAP = {
  Code2, Brain, Palette, Server, Monitor, Database, Box, GitBranch,
  Network, Shield, Radio, FlaskConical, BookOpen, Cpu, Globe, Layers,
  Terminal, Cloud, Lock, Zap,
}

// Icons offered in the "new discipline" picker (subset, visually distinct).
export const PICKABLE_ICONS = [
  'Code2', 'Brain', 'Palette', 'Server', 'Database', 'Box',
]

// Color swatches offered in the "new discipline" picker.
export const PICKABLE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B',
  '#10B981', '#EF4444', '#6366F1', '#06B6D4',
]

export const resolveIcon = (name) => ICON_MAP[name] ?? BookOpen
