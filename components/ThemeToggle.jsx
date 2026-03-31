import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const [glass, setGlass] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('theme') === 'glass'
    setGlass(saved)
    if (saved) document.documentElement.classList.add('glass-mode')
  }, [])

  const toggle = () => {
    const next = !glass
    setGlass(next)
    if (next) {
      document.documentElement.classList.add('glass-mode')
      localStorage.setItem('theme', 'glass')
    } else {
      document.documentElement.classList.remove('glass-mode')
      localStorage.setItem('theme', 'light')
    }
  }

  return (
    <button
      onClick={toggle}
      title={glass ? 'Mode iOS' : 'Mode Glass'}
      className="
        fixed bottom-5 right-5 z-50
        w-11 h-11 rounded-full shadow-lg
        flex items-center justify-center
        transition-all duration-300 active:scale-90
        bg-[var(--color-card)] border border-[var(--color-border)]
        text-[var(--color-foreground)]
      "
    >
      {glass ? (
        // Sun — back to light
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41
            M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        // Moon — switch to glass
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  )
}
