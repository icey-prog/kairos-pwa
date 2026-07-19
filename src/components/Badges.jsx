import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Award, Lock, Unlock, Trophy, Flame, Star,
  Footprints, Sword, Cpu, Sparkles, Medal, Crown, BookOpen,
} from 'lucide-react'
import useSWR from 'swr'
import { Card, CardContent } from '../lib/ui'
import { API, fetcher } from '../lib/api'

// Image custom : dépose un fichier public/badges/<id>.png ou .gif — les GIF
// s'animent tout seuls dans <img>. Fichier absent → fallback icône lucide.
const BADGES_CONFIG = [
  { id: 'first-step',  name: 'Premier Pas',   description: 'Gagner tes premiers XP',    icon: 'Footprints', image: '/badges/first_step.png', condition: { type: 'xp', value: 10 } },
  { id: 'flame',       name: 'En Feu',         description: 'Atteindre 100 XP',          icon: 'Flame',      image: '/badges/flame.jpg',      condition: { type: 'xp', value: 100 } },
  { id: 'warrior',     name: 'Guerrier',        description: 'Atteindre 500 XP',          icon: 'Sword',      image: '/badges/warrior.gif',    condition: { type: 'xp', value: 500 } },
  { id: 'neural',      name: 'Neural',          description: 'Atteindre 1 000 XP',        icon: 'Cpu',        image: '/badges/neural.gif',     condition: { type: 'xp', value: 1000 } },
  { id: 'spark',       name: 'Étincelle',       description: 'Atteindre 2 500 XP',        icon: 'Sparkles',   image: '/badges/spark.jpg',      condition: { type: 'xp', value: 2500 } },
  { id: 'scholar',     name: 'Érudit',          description: 'Atteindre 5 000 XP',        icon: 'BookOpen',   image: '/badges/scholar.jpg',    condition: { type: 'xp', value: 5000 } },
  { id: 'medalist',    name: 'Médaillé',        description: 'Atteindre 10 000 XP',       icon: 'Medal',      image: '/badges/minecraft.png',  condition: { type: 'xp', value: 10000 } },
  { id: 'crowned',     name: 'Couronné',        description: 'Atteindre 25 000 XP',       icon: 'Crown',      image: '/badges/crowned.gif',    condition: { type: 'xp', value: 25000 } },
]

const ICON_MAP = { Footprints, Flame, Sword, Cpu, Sparkles, BookOpen, Medal, Crown, Award }

const getBadgeIcon = (name) => ICON_MAP[name] ?? Award

// Visuel d'un badge : image custom si le fichier existe, sinon icône lucide.
// locked = image en niveaux de gris assombrie derrière le cadenas.
function BadgeVisual({ badge, locked = false }) {
  const [imgFailed, setImgFailed] = useState(false)
  const Icon = getBadgeIcon(badge.icon)

  if (badge.image && !imgFailed) {
    return (
      <img
        src={badge.image}
        alt={badge.name}
        onError={() => setImgFailed(true)}
        className={`w-full h-full object-contain ${locked ? 'grayscale opacity-40' : ''}`}
        draggable={false}
      />
    )
  }
  if (locked) return <Lock className="w-5 h-5 text-[var(--color-muted-foreground)]" />
  return <Icon className="w-6 h-6 text-amber-400" />
}

export default function Badges() {
  const { data: xpData } = useSWR(`${API}/xp/balance`, fetcher, { refreshInterval: 5000 })
  const xpBalance = xpData?.balance ?? 0

  const badges = useMemo(
    () =>
      BADGES_CONFIG.map((b) => ({
        ...b,
        unlockedAt: xpBalance >= b.condition.value ? new Date() : null,
      })),
    [xpBalance],
  )

  const unlocked = badges.filter((b) => b.unlockedAt)
  const locked = badges.filter((b) => !b.unlockedAt)
  const progress = (unlocked.length / badges.length) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 px-5 py-4 pb-24"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">Tes Badges</h1>
        <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
          Collectionne tous les badges en progressant
        </p>
      </div>

      {/* Global progress */}
      <Card className="glass border-0 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[var(--color-foreground)]">
                  {unlocked.length} / {badges.length}
                </h2>
                <p className="text-sm text-[var(--color-muted-foreground)]">Badges débloqués</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-400">{progress.toFixed(0)}%</p>
              <p className="text-xs text-[var(--color-muted-foreground)]">Complété</p>
            </div>
          </div>
          <div className="h-3 bg-[var(--color-secondary)] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-amber-400 to-orange-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <p className="text-xs text-[var(--color-muted-foreground)] mt-2 text-right">
            {xpBalance.toLocaleString()} XP accumulés
          </p>
        </CardContent>
      </Card>

      {/* Unlocked badges */}
      {unlocked.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-[var(--color-foreground)] flex items-center gap-2">
            <Unlock className="w-4 h-4 text-emerald-400" />
            Débloqués ({unlocked.length})
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {unlocked.map((badge, i) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05, type: 'spring' }}
              >
                <Card className="glass border-0 card-hover overflow-hidden">
                  <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
                  <CardContent className="p-4 text-center">
                    <motion.div
                      className="w-16 h-16 mx-auto mb-2 rounded-2xl overflow-hidden flex items-center justify-center"
                      whileHover={{ rotate: [0, -10, 10, 0] }}
                    >
                      <BadgeVisual badge={badge} />
                    </motion.div>
                    <h3 className="font-semibold text-sm text-[var(--color-foreground)] mb-1">{badge.name}</h3>
                    <p className="text-xs text-[var(--color-muted-foreground)]">{badge.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Locked badges */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-[var(--color-muted-foreground)] flex items-center gap-2">
          <Lock className="w-4 h-4" />
          À débloquer ({locked.length})
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {locked.map((badge, i) => (
            <motion.div
              key={badge.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card className="glass border-0 opacity-60">
                <CardContent className="p-4 text-center">
                  <div className="relative w-16 h-16 mx-auto mb-2 rounded-2xl overflow-hidden bg-[var(--color-secondary)] flex items-center justify-center">
                    <BadgeVisual badge={badge} locked />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 rounded-full bg-black/50 flex items-center justify-center">
                        <Lock className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-sm text-[var(--color-foreground)] mb-1">{badge.name}</h3>
                  <p className="text-[10px] text-[var(--color-muted-foreground)]">
                    {badge.condition.value.toLocaleString()} XP requis
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Encouragement */}
      <Card className="glass border-0 bg-amber-500/10">
        <CardContent className="p-5 text-center">
          <Star className="w-10 h-10 mx-auto mb-2 text-amber-400" />
          <h3 className="text-base font-semibold text-[var(--color-foreground)] mb-1">Continue sur cette lancée !</h3>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Chaque badge représente une étape vers le top 1%.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  )
}
