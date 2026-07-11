import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { Button } from '../lib/ui'
import { haptic } from '../lib/haptic'

// Renders the cached illustration_svg (if any) + an "Illustrer"/"Régénérer" CTA
// that calls the given endpoint to generate one via Claude.
//
// Security: always <img src="data:image/svg+xml,...">, never
// dangerouslySetInnerHTML — an SVG loaded through <img> cannot run scripts or
// fetch external resources (browser-enforced), which is the only thing that
// makes it safe to display LLM-generated markup at all. Do not change this
// to inline rendering.
export default function Illustration({ svg, endpoint, onGenerated }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const generate = async () => {
    setLoading(true)
    setError(null)
    haptic.light()
    try {
      const res = await endpoint()
      if (!res.ok) throw new Error(`illustrate failed: ${res.status}`)
      const updated = await res.json()
      onGenerated(updated)
      haptic.success()
    } catch (err) {
      console.error('[Illustration.generate]', err)
      setError("Génération impossible — réessaie dans une minute.")
      haptic.error()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      {svg && (
        <img
          src={`data:image/svg+xml,${encodeURIComponent(svg)}`}
          alt="Illustration animée du concept"
          className="w-full rounded-xl bg-[var(--color-secondary)]"
        />
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={generate}
        disabled={loading}
        className="w-full gap-2"
      >
        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        {loading ? 'Génération…' : svg ? 'Régénérer' : 'Illustrer'}
      </Button>
      {error && <p className="text-[12px] text-rose-500 text-center">{error}</p>}
    </div>
  )
}
