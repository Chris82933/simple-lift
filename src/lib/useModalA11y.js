import { useEffect } from 'react'

// Accessibility plumbing shared by every overlay/dialog: Escape to close, a
// focus trap so Tab can't wander to the page behind, and focus restore back to
// whatever opened the modal. Pair it with role="dialog" + aria-modal="true" on
// the container. `ref` points at the dialog element; `onClose` is called on
// Escape (pass the same handler your Cancel/Done button uses).
const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export default function useModalA11y(ref, onClose, active = true) {
  useEffect(() => {
    if (!active) return
    const node = ref.current
    if (!node) return

    // Remember what had focus so we can hand it back on close.
    const prevFocus = document.activeElement

    // Move focus into the dialog unless something inside already grabbed it
    // (e.g. an autoFocus search field).
    if (!node.contains(document.activeElement)) {
      const first = node.querySelector(FOCUSABLE)
      ;(first || node).focus()
    }

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...node.querySelectorAll(FOCUSABLE)].filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      )
      if (items.length === 0) { e.preventDefault(); return }
      const first = items[0]
      const last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('keydown', onKeyDown, true)
      // Only restore if focus is still inside the (closing) dialog, so we don't
      // yank focus away from wherever the user has since moved it.
      if (prevFocus && typeof prevFocus.focus === 'function' && node.contains(document.activeElement)) {
        prevFocus.focus()
      }
    }
  }, [ref, onClose, active])
}
