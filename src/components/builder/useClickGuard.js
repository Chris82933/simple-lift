import { useRef } from 'react'

// Reorder and remove buttons move (or vanish) the moment they are clicked, so
// the pointer is left over a DIFFERENT item's button. A double-click — or just
// an impatient second click — then undid the move, or deleted a second
// exercise. This swallows a pointer click that lands within a beat of the
// previous one. Keyboard activation (event.detail === 0) is never swallowed:
// focus travels with the item, so a repeated Enter is deliberate.
export default function useClickGuard(ms = 450) {
  const last = useRef(0)
  return (fn) => (e) => {
    const now = Date.now()
    if (e && e.detail > 0 && now - last.current < ms) return
    last.current = now
    fn(e)
  }
}
