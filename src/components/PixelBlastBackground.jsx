import { lazy, Suspense, useEffect, useState } from 'react'

// three.js (~600KB) chargé en lazy pour ne pas alourdir le bundle initial —
// le fond apparaît une fraction de seconde après l'app, c'est voulu.
const PixelBlast = lazy(() => import('./PixelBlast/PixelBlast'))

// Wash = couleur réelle de la page (identique à l'ancien --color-background,
// html/body est devenu transparent — voir globals.css). Le design ne change
// pas visuellement au centre ; seul un accent pixel discret orne les coins.
const PALETTE = {
  dark: { pixel: '#BFBFBF', wash: '#000000' },
  light: { pixel: '#353A3E', wash: '#ffffff' },
}

export default function PixelBlastBackground() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark-mode'))

  useEffect(() => {
    const el = document.documentElement
    const observer = new MutationObserver(() => setDark(el.classList.contains('dark-mode')))
    observer.observe(el, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  const { pixel, wash } = dark ? PALETTE.dark : PALETTE.light

  return (
    <div
      className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-300"
      style={{ backgroundColor: wash }}
      aria-hidden="true"
    >
      <Suspense fallback={null}>
        <PixelBlast
          variant="square"
          pixelSize={3}
          color={pixel}
          patternScale={2.5}
          patternDensity={0.6}
          pixelSizeJitter={0}
          enableRipples={false}
          liquid={false}
          speed={0.35}
          edgeFade={0.32}
          transparent
          style={{ opacity: 0.35 }}
        />
      </Suspense>
    </div>
  )
}
