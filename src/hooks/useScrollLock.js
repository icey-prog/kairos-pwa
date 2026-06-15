import { useEffect } from 'react'

// Locks <body> scroll while `locked` is true (e.g. a bottom sheet is open),
// so the page behind doesn't scroll. Restores the previous value on unlock/unmount.
// Ref-counted so nested/concurrent locks don't unlock each other prematurely.
let lockCount = 0
let savedOverflow = ''

export function useScrollLock(locked) {
  useEffect(() => {
    if (!locked) return
    if (lockCount === 0) {
      savedOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }
    lockCount += 1
    return () => {
      lockCount -= 1
      if (lockCount === 0) document.body.style.overflow = savedOverflow
    }
  }, [locked])
}
