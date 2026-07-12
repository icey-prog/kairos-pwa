import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '../lib/ui'
import { haptic } from '../lib/haptic'
import { cn } from '../lib/utils'
import CodeText from './CodeText'

// Step-by-step code walkthrough (file + code + explanation per stage) — the
// same mental model as the visualize-tool stepper used during a revision
// session, ported into the app. `steps` is [{ file, code, lang?, note }].
// Code is always rendered through CodeText (highlight.js on plain text),
// never raw HTML — this field is client-authored (pasted), so no
// dangerouslySetInnerHTML surface here.
export default function CodeWalkthrough({ steps }) {
  const [i, setI] = useState(0)
  if (!steps?.length) return null
  const step = steps[i]
  const fence = `\`\`\`${step.lang || 'dart'}\n${step.code}\n\`\`\``

  return (
    <div className="space-y-3">
      {step.file && (
        <p className="text-[11px] font-mono text-[var(--color-muted-foreground)] truncate">{step.file}</p>
      )}
      <CodeText text={fence} />
      {step.note && (
        <p className="text-[14px] leading-relaxed text-[var(--color-foreground)]">{step.note}</p>
      )}
      <div className="flex items-center gap-2 pt-1">
        <Button
          variant="outline"
          size="sm"
          disabled={i === 0}
          onClick={() => { haptic.light(); setI((n) => Math.max(0, n - 1)) }}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Précédent
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={i === steps.length - 1}
          onClick={() => { haptic.light(); setI((n) => Math.min(steps.length - 1, n + 1)) }}
          className="gap-1"
        >
          Suivant <ChevronRight className="w-4 h-4" />
        </Button>
        <span className={cn('text-[12px] text-[var(--color-muted-foreground)] ml-auto')}>
          Étape {i + 1}/{steps.length}
        </span>
      </div>
    </div>
  )
}
