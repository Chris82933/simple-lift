import { useEffect, useState } from 'react'
import { getInstallPrompt, promptInstall, isStandalone, getPlatform } from '../lib/installPrompt.js'

// "Install to home screen" card for the Profile page. Uses the native install
// prompt on Android/Chromium and falls back to manual instructions on iOS.
export default function InstallApp() {
  const [installed, setInstalled] = useState(isStandalone())
  const [canPrompt, setCanPrompt] = useState(!!getInstallPrompt())
  const [showSteps, setShowSteps] = useState(false)
  const platform = getPlatform()

  useEffect(() => {
    const onAvail = () => setCanPrompt(true)
    const onInstalled = () => { setInstalled(true); setCanPrompt(false) }
    window.addEventListener('sl-install-available', onAvail)
    window.addEventListener('sl-installed', onInstalled)
    return () => {
      window.removeEventListener('sl-install-available', onAvail)
      window.removeEventListener('sl-installed', onInstalled)
    }
  }, [])

  if (installed) {
    return (
      <div className="card install-card">
        <p className="group-label">Install</p>
        <p className="muted small">✓ You&apos;re running Simple Lift as an installed app. Nice. 💪</p>
      </div>
    )
  }

  const doInstall = async () => {
    const outcome = await promptInstall()
    if (outcome === 'accepted') setInstalled(true)
  }

  return (
    <div className="card install-card">
      <p className="group-label">📲 Install Simple Lift</p>
      <p className="muted small">
        Add it to your home screen for a full-screen, app-like experience that opens in one
        tap and works offline.
      </p>

      {/* Android / desktop Chromium — native install prompt */}
      {canPrompt && (
        <button type="button" className="btn btn-primary" onClick={doInstall}>
          Install app
        </button>
      )}

      {/* iOS Safari — manual Add to Home Screen */}
      {!canPrompt && platform === 'ios' && (
        <>
          <button type="button" className="btn btn-primary" onClick={() => setShowSteps((s) => !s)}>
            {showSteps ? 'Hide steps' : 'Add to Home Screen'}
          </button>
          {showSteps && (
            <ol className="install-steps">
              <li>Tap the <strong>Share</strong> icon <span className="kbd">⬆️</span> in Safari&apos;s toolbar.</li>
              <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
              <li>Tap <strong>Add</strong> — Simple Lift lands on your home screen like any app.</li>
            </ol>
          )}
          <p className="muted small">On iPhone &amp; iPad this works in <strong>Safari</strong> only.</p>
        </>
      )}

      {/* Android without a captured prompt (e.g. already dismissed) */}
      {!canPrompt && platform === 'android' && (
        <ol className="install-steps">
          <li>Tap the <strong>⋮</strong> menu (top-right) in Chrome.</li>
          <li>Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</li>
        </ol>
      )}

      {/* Anything else */}
      {!canPrompt && platform === 'other' && (
        <p className="muted small">
          Open your browser&apos;s menu and choose <strong>Install app</strong> or{' '}
          <strong>Add to Home Screen</strong>. (On a phone, use Chrome on Android or Safari on iPhone.)
        </p>
      )}
    </div>
  )
}
