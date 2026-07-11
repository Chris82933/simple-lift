// Rough iOS / iPadOS detection. iPadOS 13+ reports as "Macintosh", so we also
// treat a touch-capable Mac as iOS. Used only to warn about Safari's habit of
// deleting local data after ~7 days of no use — never to gate features.
export function isIOS() {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const classic = /iP(hone|ad|od)/.test(ua)
  const iPadOS = /Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1
  return classic || iPadOS
}

// Running as an installed / home-screen app rather than a Safari tab.
export function isStandalone() {
  if (typeof navigator !== 'undefined' && navigator.standalone) return true
  if (typeof matchMedia !== 'undefined') {
    try { return matchMedia('(display-mode: standalone)').matches } catch { /* ignore */ }
  }
  return false
}
