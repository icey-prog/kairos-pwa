import { useEffect, useState } from 'react'
import { WifiOff, RefreshCw } from 'lucide-react'
import { onCountChange, flush } from '../lib/offlineQueue'

// Permanent network indicator: hidden when online with an empty queue,
// amber when offline, blue while queued mutations are waiting to sync.
export default function NetworkBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const on = () => { setOnline(true); flush() }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const unsub = onCountChange(setPending)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      unsub()
    }
  }, [])

  if (online && pending === 0) return null

  return (
    <div
      className={`fixed top-0 inset-x-0 z-[100] flex items-center justify-center gap-2 py-1.5 text-[12px] font-semibold text-white ${
        online ? 'bg-blue-500' : 'bg-amber-500'
      }`}
    >
      {online ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <WifiOff className="w-3.5 h-3.5" />}
      {online
        ? `Synchronisation — ${pending} action${pending > 1 ? 's' : ''} en attente`
        : `Hors ligne${pending > 0 ? ` — ${pending} action${pending > 1 ? 's' : ''} en attente` : ' — tes actions seront synchronisées'}`}
    </div>
  )
}
