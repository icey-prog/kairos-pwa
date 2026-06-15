// Maps a discipline slug → a Simple Icons slug, so we can render the real brand
// logo from the Simple Icons CDN (https://cdn.simpleicons.org/<slug>/<hexNoHash>).
// Disciplines without a confident brand match are omitted → caller falls back to a Lucide icon.
const BRAND = {
  'flutter-dart':    'flutter',
  'frontend-svelte': 'svelte',
  'frontend-pwa':    'pwa',
  'backend-python':  'python',
  'backend-laravel': 'laravel',
  'backend-nodejs':  'nodedotjs',
  'backend-fastify': 'fastify',
  'realtime':        'socketdotio',
  'redis':           'redis',
  'sql-orm':         'postgresql',
  'docker':          'docker',
  'cicd':            'githubactions',
  'design':          'figma',
}

export const brandSlug = (disciplineSlug) => BRAND[disciplineSlug] ?? null

// Build a Simple Icons CDN URL, brand-tinted with the discipline color.
export const brandLogoUrl = (disciplineSlug, color) => {
  const slug = brandSlug(disciplineSlug)
  if (!slug) return null
  const hex = (color || '').replace('#', '')
  return hex ? `https://cdn.simpleicons.org/${slug}/${hex}` : `https://cdn.simpleicons.org/${slug}`
}
