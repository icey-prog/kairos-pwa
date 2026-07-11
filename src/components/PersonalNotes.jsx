import { useState, useEffect } from 'react'
import { NotebookPen } from 'lucide-react'
import { Textarea } from '../lib/ui'
import { haptic } from '../lib/haptic'

// Free-text "questions/notes for later" block — same field on Feynman notes
// and SM-2 cards. Saves on blur only if the text actually changed.
// This is the capture point for the future RAG+LLM pipeline: unstructured,
// no parsing here, just persisted as-is.
export default function PersonalNotes({ value, onSave }) {
  const [text, setText] = useState(value || '')

  useEffect(() => setText(value || ''), [value])

  const handleBlur = () => {
    if (text === (value || '')) return
    haptic.light()
    onSave(text)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <NotebookPen className="w-4 h-4" style={{ color: '#a855f7' }} />
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
          Questions & notes
        </p>
      </div>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        placeholder="Une question qui te reste, un doute, un lien à creuser plus tard…"
        className="min-h-[70px] border-dashed"
      />
    </div>
  )
}
