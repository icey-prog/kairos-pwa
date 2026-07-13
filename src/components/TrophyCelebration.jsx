import { useEffect, useRef, useState } from 'react'

// Fullscreen trophy animation, fired via: window.dispatchEvent(new CustomEvent('mile:trophy'))
// lottie-web (light, svg-only) is lazy-imported on first trigger so it never
// weighs on the initial bundle.
export default function TrophyCelebration() {
  const [visible, setVisible] = useState(false)
  const containerRef = useRef(null)
  const animRef = useRef(null)

  useEffect(() => {
    const onTrophy = () => setVisible(true)
    window.addEventListener('mile:trophy', onTrophy)
    return () => window.removeEventListener('mile:trophy', onTrophy)
  }, [])

  useEffect(() => {
    if (!visible || !containerRef.current) return
    let cancelled = false
    ;(async () => {
      try {
        const lottie = (await import('lottie-web/build/player/lottie_light')).default
        const data = await fetch('/lottie/Trophy.json').then((r) => r.json())
        if (cancelled) return
        animRef.current = lottie.loadAnimation({
          container: containerRef.current,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          animationData: data,
        })
        animRef.current.addEventListener('complete', () => setVisible(false))
      } catch {
        setVisible(false)
      }
    })()
    return () => {
      cancelled = true
      animRef.current?.destroy()
      animRef.current = null
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={() => setVisible(false)}
    >
      <div ref={containerRef} className="w-72 h-72" />
    </div>
  )
}
