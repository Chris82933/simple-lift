import { createContext, useCallback, useContext, useRef, useState } from 'react'

// Lightweight global toast with an optional action (used for "Deleted — Undo").
const ToastCtx = createContext(null)
export const useToast = () => useContext(ToastCtx) || { show: () => {} }

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null) // { id, message, actionLabel, onAction }
  const timer = useRef(null)

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
