import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

// Lightweight global toast with an optional action (used for "Deleted — Undo").
const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx) || { show: () => {} }

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { id, message, actionLabel, onAction }
  const timer = useRef(null)

  // Subtle "Saved" flash whenever a setting is auto-saved (fired by saveSettings).
  const [saved, setSaved] = useState(false)
  const savedTimer = useRef(null)
  useEffect(() => {
    const onSaved = () => {
      setSaved(true)
      clearTimeout(savedTimer.current)
      savedTimer.current = setTimeout(() => setSaved(false), 1400)
    }
    window.addEventListener('sl-saved', onSaved)
    return () => { window.removeEventListener('sl-saved', onSaved); clearTimeout(savedTimer.current) }
  }, [])

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setToast(null)
  }, [])

  const show = useCallback((message, opts = {}) => {
    clearTimeout(timer.current)
    const id = Date.now()
    setToast({ id, message, actionLabel: opts.actionLabel, onAction: opts.onAction })
    timer.current = setTimeout(() => {
      setToast((t) => (t && t.id === id ? null : t))
    }, opts.duration || 6000)
  }, [])

  return (
    <ToastCtx.Provider value={{ show, dismiss }}>
      {children}
      <div className={'saved-flash' + (saved ? ' is-shown' : '')} role="status" aria-hidden={!saved}>✓ Saved</div>
      {toast && (
        <div className="toast" role="status">
          <span className="toast-msg">{toast.message}</span>
          {toast.actionLabel && (
            <button
              type="button"
              className="toast-action"
              onClick={() => { toast.onAction?.(); dismiss() }}
            >
              {toast.actionLabel}
            </button>
          )}
          <button type="button" className="toast-close" onClick={dismiss} aria-label="Dismiss">✕</button>
        </div>
      )}
    </ToastCtx.Provider>
  )
}
