// Best-effort "rest's over" notification for when the app is in the background.
//
// Reliability differs by platform, and we're honest about it:
//  • Chrome / Android — the Notification Triggers API (TimestampTrigger) fires
//    precisely even if the tab is backgrounded or the app is closed.
//  • Where triggers aren't supported, a timeout shows it via the service worker.
//    Background timers are throttled but still fire for short rests.
//  • iOS suspends background JS entirely, so a while-you're-away buzz can't be
//    guaranteed — the in-app timer itself stays accurate regardless (it counts
//    from an absolute end time, not by ticking).
//
// The rest timer schedules a notification when the app goes to the background and
// cancels it the moment the app returns, so a redundant one never fires while the
// user is looking at the screen.

const TAG = 'sl-rest-done'
let fallbackTimer = null

const NOTE = {
  body: 'Rest’s over — time for your next set. 💪',
  tag: TAG,
  renotify: true,
  icon: `${import.meta.env.BASE_URL}icon.svg`,
  badge: `${import.meta.env.BASE_URL}icon.svg`,
}

export const notificationsSupported = () =>
  typeof window !== 'undefined' && 'Notification' in window

export const notificationPermission = () =>
  notificationsSupported() ? Notification.permission : 'denied'

export async function requestNotifyPermission() {
  if (!notificationsSupported()) return false
  try {
    return (await Notification.requestPermission()) === 'granted'
  } catch {
    return false
  }
}

// getRegistration resolves immediately (undefined when there's no SW, e.g. in
// dev) — unlike .ready, which would hang forever without one.
async function swReg() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null
  try {
    return (await navigator.serviceWorker.getRegistration()) || null
  } catch {
    return null
  }
}

const canTrigger = () =>
  notificationsSupported() && 'showTrigger' in Notification.prototype && typeof TimestampTrigger !== 'undefined'

// Schedule the "rest complete" notification for the moment `endAt` (epoch ms).
export async function scheduleRestDone(endAt) {
  if (notificationPermission() !== 'granted') return
  await cancelRestDone()
  const reg = await swReg()

  if (reg && canTrigger()) {
    try {
      await reg.showNotification('Rest complete', { ...NOTE, showTrigger: new TimestampTrigger(endAt) })
      return
    } catch { /* fall through to the timeout fallback */ }
  }

  const delay = Math.max(0, endAt - Date.now())
  fallbackTimer = setTimeout(async () => {
    fallbackTimer = null
    const r = await swReg()
    try {
      if (r) await r.showNotification('Rest complete', NOTE)
      else if (notificationPermission() === 'granted') new Notification('Rest complete', NOTE)
    } catch { /* ignore */ }
  }, delay)
}

// Cancel a pending notification (timeout and/or a scheduled trigger).
export async function cancelRestDone() {
  if (fallbackTimer) { clearTimeout(fallbackTimer); fallbackTimer = null }
  const reg = await swReg()
  if (!reg) return
  try {
    const notes = await reg.getNotifications({ tag: TAG, includeTriggered: true })
    notes.forEach((n) => n.close())
  } catch { /* getNotifications options vary by browser — ignore */ }
}
