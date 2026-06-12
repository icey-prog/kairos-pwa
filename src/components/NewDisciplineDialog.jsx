import { useState } from 'react'
import { mutate } from 'swr'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input } from '../lib/ui'
import { API } from '../lib/api'
import { PICKABLE_ICONS, PICKABLE_COLORS, resolveIcon } from '../lib/disciplineIcons'
import { haptic } from '../lib/haptic'
import { cn } from '../lib/utils'

// Inline discipline creation — opened from the discipline picker in card/note dialogs.
// onCreated(slug) is called after a successful POST so the caller can select it immediately.
export default function NewDisciplineDialog({ open, onOpenChange, onCreated }) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PICKABLE_COLORS[0])
  const [icon, setIcon] = useState(PICKABLE_ICONS[0])
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const res = await fetch(`${API}/disciplines`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), color, icon }),
      })
      if (!res.ok) throw new Error(`create discipline failed: ${res.status}`)
      const created = await res.json()
      haptic.success()
      mutate(`${API}/disciplines`)
      onCreated?.(created.slug)
      setName('')
      onOpenChange(false)
    } catch (err) {
      console.error('[NewDisciplineDialog]', err)
      haptic.error()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle discipline</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Nom</label>
            <Input
              placeholder="Ex: Blockchain"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Couleur</label>
            <div className="flex flex-wrap gap-2">
              {PICKABLE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { haptic.select(); setColor(c) }}
                  className={cn(
                    'w-9 h-9 rounded-full transition-transform active:scale-90',
                    color === c && 'ring-2 ring-offset-2 ring-offset-[var(--color-background)]',
                  )}
                  style={{ background: c, '--tw-ring-color': c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block text-[var(--color-foreground)]">Icône</label>
            <div className="flex flex-wrap gap-2">
              {PICKABLE_ICONS.map((name) => {
                const Icon = resolveIcon(name)
                const active = icon === name
                return (
                  <button
                    key={name}
                    onClick={() => { haptic.select(); setIcon(name) }}
                    className={cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-90',
                      active ? 'text-white' : 'glass border border-[var(--color-border)] text-[var(--color-muted-foreground)]',
                    )}
                    style={active ? { background: color } : undefined}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                )
              })}
            </div>
          </div>

          <Button onClick={submit} className="w-full" disabled={!name.trim() || saving}>
            Créer la discipline
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
