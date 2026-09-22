import { useRegisterSW } from 'virtual:pwa-register/react'

// Service-worker update handling. The app used to update with `autoUpdate`,
// which could swap the worker and reload the page mid-workout — taking any
// unsaved edits with it. Now we register manually and ASK, so the reload only
// ever happens when the user is ready for it.
//
// Inline styles keep this independent of the stylesheet (it can appear before
// the app has rendered anything else).
const bar = {
  position: 'fixed',
  left: '50%',
  transform: 'translateX(-50%)',
  bottom: 'calc(96px + env(safe-area-inset-bottom, 0px))',
  zIndex: 40,
  width: 'calc(100% - 24px)',
  maxWidth: 496,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 14,
  background: 'var(--surface-2, #26262b)',
  color: 'var(--text, #f4f4f5)',
  border: '1px solid var(--border, #36363c)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  fontSize: 14,
}
const btn = {
  border: 'none',
  borderRadius: 9,
  padding: '8px 12px',
  fontWeight: 700,
  fontSize: 13,
  cursor: 'pointer',
  flex: 'none',
}

export default function UpdatePrompt() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div style={bar} role="status">
      <span style={{ flex: 1, minWidth: 0 }}>A new version is ready.</span>
      <button
        type="button"
        style={{ ...btn, background: 'var(--accent, #4dffbc)', color: 'var(--accent-ink, #04140f)' }}
        onClick={() => updateServiceWorker(true)}
      >
        Update
      </button>
      <button
        type="button"
        style={{ ...btn, background: 'transparent', color: 'var(--muted, #898989)' }}
        onClick={() => setNeedRefresh(false)}
      >
        Later
      </button>
    </div>
  )
}
