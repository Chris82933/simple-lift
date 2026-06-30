// Home-screen install helper.
//
// Android / desktop Chromium fire a `beforeinstallprompt` event we can capture
// and replay from a button to trigger the native install flow. iOS Safari has
// no such API — there we show manual "Add to Home Screen" instructions.
//
// The event can fire before React mounts, so we capture it at app start and
// stash it; the UI reads it via getInstallPrompt() / the 'sl-install-available'
// event.

let deferred = null

export function initInstallPrompt() {
  if (typeof window === 'undefined') return
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault() // stop Chrome's mini-infobar; we'll trigger it ourselves
    deferred = e
    window.dispatchEvent(new CustomEvent('sl-install-available'))
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    window.dispatchEvent(new CustomEvent('sl-installed'))
  })
}

export const getInstallPrompt = () => deferred

// Returns the user's choice: 'accepted' | 'dismissed' | null (no prompt available).
export async function promptInstall() {
  if (!deferred) return null
  deferred.prompt()
  const { outcome } = await deferred.userChoice
  if (outcome === 'accepted') deferred = null
  return outcome
}

// True when the app is already running as an installed PWA.
export function isStandalone() {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(display-mode: standalone)').matches
    || window.navigator.standalone === true // iOS Safari
}

export function getPlatform() {
  const ua = navigator.userAgent || ''
  // iPadOS 13+ masquerades as a Mac — detect it via touch points.
  const iOS = /iphone|ipad|ipod/i.test(ua)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (iOS) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}
