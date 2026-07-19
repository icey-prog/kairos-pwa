import { lazy, Suspense, useEffect, useState } from 'react'

// three.js (~600KB) chargé en lazy pour ne pas alourdir le bundle initial —
// le fond apparaît une fraction de seconde après l'app, c'est voulu.
const PixelBlast = lazy(() => import('./PixelBlast/PixelBlast'))

// Palette perso : nuances neutres, un ton clair + un ton foncé par thème
// pour que les pixels restent lisibles sur le fond de la page.
const PALETTE = {
  dark: { pixel: '#BFBFBF', wash: '#1A1A1A' },  // Ash sur Jet Black
  light: { pixel: '#353A3E', wash: '#E0E0E0' }, // Graphite sur Platinum
}

// Fond d'écran global : pixels dithering animés (WebGL), derrière tout le
// contenu. pointer-events none — les ripples au clic sont sacrifiés pour ne
// jamais bloquer un tap sur l'UI.
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
          pixelSize={4}
          color={pixel}
          patternScale={2}
          patternDensity={1}
          pixelSizeJitter={0}
          enableRipples
          rippleSpeed={0.4}
          rippleThickness={0.12}
          rippleIntensityScale={1.5}
          liquid={false}
          liquidStrength={0.12}
          liquidRadius={1.2}
          liquidWobbleSpeed={5}
          speed={0.7}
          edgeFade={0.25}
          transparent
        />
      </Suspense>
    </div>
  )
}
