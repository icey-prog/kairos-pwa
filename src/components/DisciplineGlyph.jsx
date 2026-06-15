import { useState, useEffect } from 'react'
import { resolveIcon } from '../lib/disciplineIcons'
import { brandLogoUrl } from '../lib/brandLogos'

// Renders a discipline's real brand logo (Simple Icons CDN) when one is mapped,
// falling back to the Lucide icon on no-match or load failure (offline / blocked).
export default function DisciplineGlyph({ discipline, size = 20, className = '' }) {
  const url = brandLogoUrl(discipline?.slug, discipline?.color)
  const [failed, setFailed] = useState(false)

  // Reset failure state if the discipline changes.
  useEffect(() => { setFailed(false) }, [discipline?.slug])

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={className}
        style={{ width: size, height: size, objectFit: 'contain' }}
      />
    )
  }

  const Icon = resolveIcon(discipline?.icon)
  return <Icon className={className} style={{ color: discipline?.color, width: size, height: size }} />
}
