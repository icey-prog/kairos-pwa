import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { haptic } from '../lib/haptic'
import { useScrollLock } from '../hooks/useScrollLock'

// Shared mobile bottom-sheet primitive — one consistent surface for every contextual menu.
// Drag handle + spring-up + backdrop blur, matching the FloatingNav sheet aesthetic.
export default function BottomSheet({ open, onClose, title, children }) {
  useScrollLock(open)   // freeze the page behind the sheet
  const close = () => { haptic.light(); onClose() }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="bs-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
            onClick={close}
          />
          <motion.div
            key="bs-panel"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 40 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => { if (info.offset.y > 120) close() }}
            className="fixed bottom-0 left-0 right-0 z-[70] bg-[var(--color-background)] rounded-t-3xl shadow-2xl pb-[max(env(safe-area-inset-bottom),1rem)] max-h-[88vh] flex flex-col"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
            </div>

            {/* Header — single clear title + 44px close target */}
            <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
              <h2 className="text-[16px] font-bold text-[var(--color-foreground)] truncate pr-3">{title}</h2>
              <button
                onClick={close}
                className="w-11 h-11 -mr-2 rounded-full flex items-center justify-center text-[var(--color-muted-foreground)] active:scale-95 transition-transform flex-shrink-0"
                aria-label="Fermer"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="px-5 pb-6 overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
