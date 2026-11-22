// Keep the screen on during a long hold or a slow set (phones dim and lock
// after ~30 s, right in the middle of a 60-second stretch). Uses the Screen
// Wake Lock API where it exists; fails quietly everywhere else.
let lock = null
let wanted = false

async function request() {
  try {
    if (typeof navigator === 'undefined' || !navigator.wakeLock) return
    const l = await navigator.wakeLock.request('screen')
    // Released (left the session) while the request was still pending.
    if (!wanted) { l.release().catch(() => {}); return }
    lock = l
    l.addEventListener?.('release', () => { if (lock === l) lock = null })
  } catch {
    lock = null // battery saver, permissions, or unsupported — not an error
  }
}

// The lock drops whenever the page is hidden; take it back on return.
function onVisible() {
  if (wanted && document.visibilityState === 'visible' && !lock) request()
}

export function keepAwake() {
  wanted = true
  request()
  document.addEventListener('visibilitychange', onVisible)
}

export function allowSleep() {
  wanted = false
  document.removeEventListener('visibilitychange', onVisible)
  try { lock?.release() } catch { /* already gone */ }
  lock = null
}
