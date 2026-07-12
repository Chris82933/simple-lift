import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  isFirebaseConfigured, subscribeAuth, signInWithGoogle, signOutUser,
} from '../lib/firebase.js'
import { pullCloud, pushCloud } from '../lib/cloud.js'
import { exportData, importData, getUpdatedAt, cloudSizeInfo } from '../lib/storage.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('idle') // idle | syncing | synced | error
  const [syncNote, setSyncNote] = useState(null) // { level:'warn'|'over', pct, bytes } | null
  const pushTimer = useRef(null)

  // Track auth state (subscribeAuth resolves to an unsubscribe fn).
  useEffect(() => {
    if (!isFirebaseConfigured) return
    let active = true
    let unsub = () => {}
    subscribeAuth(setUser).then((fn) => {
      if (active) unsub = fn
      else fn()
    })
    return () => { active = false; unsub() }
  }, [])

  // On login, reconcile local <-> cloud (last-writer-wins by updatedAt).
  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setStatus('syncing')
      try {
        const cloud = await pullCloud(user.uid)
        const localUpdated = getUpdatedAt()
        if (!cloud) {
          await pushCloud(user.uid, exportData()) // first sync up
        } else if ((cloud.updatedAt || 0) > (localUpdated || 0)) {
          importData(cloud) // cloud is newer — pull it in, then refresh UI
          if (!cancelled) {
            setStatus('synced')
            window.location.reload()
            return
          }
        } else if ((localUpdated || 0) > (cloud.updatedAt || 0)) {
          await pushCloud(user.uid, exportData())
        }
        if (!cancelled) setStatus('synced')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [user])

  // Push local changes up while signed in (debounced).
  useEffect(() => {
    if (!user) return
    const onChange = () => {
      clearTimeout(pushTimer.current)
      pushTimer.current = setTimeout(() => {
        const info = cloudSizeInfo()
        if (info.over) {
          // Too big for a Firestore document — refuse the write that would fail
          // anyway, and flag it. Local data is untouched; a backup code still works.
          setSyncNote({ level: 'over', pct: info.pct, bytes: info.bytes })
          setStatus('error')
          return
        }
        setSyncNote(info.warn ? { level: 'warn', pct: info.pct, bytes: info.bytes } : null)
        pushCloud(user.uid, exportData()).then(() => setStatus('synced')).catch(() => setStatus('error'))
      }, 1500)
    }
    window.addEventListener('sl-data-changed', onChange)
    return () => {
      window.removeEventListener('sl-data-changed', onChange)
      clearTimeout(pushTimer.current)
    }
  }, [user])

  const value = {
    configured: isFirebaseConfigured,
    user,
    status,
    syncNote,
    signIn: signInWithGoogle,
    signOut: signOutUser,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
