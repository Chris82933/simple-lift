// The notification helpers must degrade gracefully: no Notification API, no
// service worker, or a denied permission should never throw — the in-app rest
// timer works regardless.
import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  notificationsSupported, notificationPermission, requestNotifyPermission,
  scheduleRestDone, cancelRestDone,
} from './notify.js'

afterEach(() => {
  delete globalThis.Notification
  vi.restoreAllMocks()
})

describe('when the Notification API is missing', () => {
  it('reports unsupported and denied', () => {
    expect(notificationsSupported()).toBe(false)
    expect(notificationPermission()).toBe('denied')
  })

  it('requesting permission resolves false, not a throw', async () => {
    await expect(requestNotifyPermission()).resolves.toBe(false)
  })

  it('scheduling and cancelling are safe no-ops', async () => {
    await expect(scheduleRestDone(Date.now() + 1000)).resolves.toBeUndefined()
    await expect(cancelRestDone()).resolves.toBeUndefined()
  })
})

describe('permission reporting', () => {
  it('reflects the browser permission state', () => {
    globalThis.Notification = { permission: 'granted', requestPermission: async () => 'granted' }
    expect(notificationsSupported()).toBe(true)
    expect(notificationPermission()).toBe('granted')
  })

  it('does not schedule when permission is not granted', async () => {
    const showNotification = vi.fn()
    globalThis.Notification = { permission: 'default', requestPermission: async () => 'default' }
    // Even with a fake SW, a non-granted permission must skip scheduling.
    vi.stubGlobal('navigator', { serviceWorker: { getRegistration: async () => ({ showNotification, getNotifications: async () => [] }) } })
    await scheduleRestDone(Date.now() + 1000)
    expect(showNotification).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })
})
