import { Component } from 'react'
import { exportCode, clearAll } from '../lib/storage.js'

// Last line of defence. The app renders straight off localStorage / cloud data,
// so one malformed record used to take the whole installed PWA to a blank white
// screen with no way back. This catches the throw and offers the two things that
// actually help: rescue your data as a backup code, or reset and start clean.
//
// Styles are inline on purpose — if the stylesheet is what broke, a fallback
// that depends on it is no fallback at all. Colours come from the theme tokens
// with hard-coded fallbacks so it stays readable either way.
const wrap = {
  minHeight: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  gap: 14,
  padding: '32px 20px',
  maxWidth: 520,
  margin: '0 auto',
  background: 'var(--bg, #101012)',
  color: 'var(--text, #f4f4f5)',
  fontFamily: "'Inter var', 'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
}
const btn = {
  padding: '12px 16px',
  borderRadius: 14,
  border: '1px solid var(--border, #36363c)',
  background: 'var(--surface, #1a1a1d)',
  color: 'var(--text, #f4f4f5)',
  fontWeight: 700,
  fontSize: 15,
  cursor: 'pointer',
}
const primaryBtn = {
  ...btn,
  background: 'var(--accent, #4dffbc)',
  color: 'var(--accent-ink, #04140f)',
  borderColor: 'transparent',
}

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null, copied: null, confirmReset: false }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Keep it in the console for anyone debugging from a device.
    console.error('Simple Lift crashed:', error, info?.componentStack)
  }

  copyBackup = async () => {
    try {
      const code = await exportCode()
      await navigator.clipboard.writeText(code)
      this.setState({ copied: 'ok' })
    } catch {
      this.setState({ copied: 'fail' })
    }
  }

  reset = () => {
    try { clearAll() } catch { /* nothing left to do */ }
    window.location.hash = '#/today'
    window.location.reload()
  }

  render() {
    const { error, copied, confirmReset } = this.state
    if (!error) return this.props.children

    return (
      <div style={wrap} role="alert">
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Something broke</h1>
        <p style={{ margin: 0, color: 'var(--muted, #898989)', lineHeight: 1.5 }}>
          The app hit an error and couldn&apos;t finish loading. Your workouts are still saved on this
          device. Copy a backup code first — then reload, or reset if it keeps happening.
        </p>

        <button type="button" style={primaryBtn} onClick={this.copyBackup}>
          Copy my backup code
        </button>
        {copied === 'ok' && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--go, #34e6a8)' }}>
            ✓ Copied — paste it somewhere safe.
          </p>
        )}
        {copied === 'fail' && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #898989)' }}>
            Couldn&apos;t build a code — your data may be the thing that&apos;s broken. Resetting will clear it.
          </p>
        )}

        <button type="button" style={btn} onClick={() => window.location.reload()}>
          Reload the app
        </button>

        {confirmReset ? (
          <>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--muted, #898989)' }}>
              This erases every program, workout and setting on this device. It cannot be undone.
            </p>
            <button
              type="button"
              style={{ ...btn, borderColor: 'var(--accent-2, #ff4d4d)', color: 'var(--accent-2, #ff4d4d)' }}
              onClick={this.reset}
            >
              Yes, erase everything
            </button>
            <button type="button" style={btn} onClick={() => this.setState({ confirmReset: false })}>
              Cancel
            </button>
          </>
        ) : (
          <button type="button" style={btn} onClick={() => this.setState({ confirmReset: true })}>
            Reset app data…
          </button>
        )}

        <details style={{ marginTop: 6 }}>
          <summary style={{ fontSize: 13, color: 'var(--muted, #898989)', cursor: 'pointer' }}>
            Technical details
          </summary>
          <pre style={{
            marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
            fontSize: 12, color: 'var(--muted, #898989)',
          }}
          >
            {String(error?.stack || error?.message || error)}
          </pre>
        </details>
      </div>
    )
  }
}
