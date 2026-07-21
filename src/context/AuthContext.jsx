import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  isFirebaseConfigured, subscribeAuth, signInWithGoogle, signOutUser,
} from '../lib/firebase.js'
import { pullCloud, pushCloud } from '../lib/cloud.js'
import {
  exportData, importData, getUpdatedAt, cloudSizeInfo,
  getSyncMarker, setSyncMarker, clearSyncMarker, syncDecision, summarizeSnapshot,
} from '../lib/storage.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('idle') // idle | syncing | synced | conflict | error
  const [syncNote, setSyncNote] = useState(null) // { level:'warn'|'over', pct, bytes } | null
  const [conflict, setConflict] = useState(null) // { cloud, local, cloudSummary } | null
  const [lastSyncedAt, setLastSyncedAt] = useState(() => getSyncMarker()?.at || 0)
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

  // On login, reconcile local <-> cloud. When BOTH sides have changed since the
  // last agreed state we stop and ask, rather than quietly discarding whichever
  // device happened to save last.
  const applyPush = async (uid) => {
    const blob = exportData()
    await pushCloud(uid, blob)
    setSyncMarker({ cloudUpdatedAt: blob.updatedAt || 0, localUpdatedAt: getUpdatedAt(), at: Date.now() })
  }
  const applyPull = (cloud) => {
    importData(cloud) // silent — does not bump updatedAt
    setSyncMarker({ cloudUpdatedAt: cloud.updatedAt || 0, localUpdatedAt: getUpdatedAt(), at: Date.now() })
  }

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setStatus('syncing')
      try {
        const cloud = await pullCloud(user.uid)
        const decision = syncDecision(cloud)
        if (cancelled) return

        if (decision === 'conflict') {
          // Hand the choice to the user, with enough detail to choose sensibly.
          setConflict({
            cloud,
            local: summarizeSnapshot(exportData()),
            cloudSummary: summarizeSnapshot(cloud),
          })
          setStatus('conflict')
          return
        }
        if (decision === 'push') await applyPush(user.uid)
        else if (decision === 'pull') {
          applyPull(cloud)
          if (!cancelled) { setStatus('synced'); window.location.reload() }
          return
        } else {
          setSyncMarker({ cloudUpdatedAt: cloud?.updatedAt || 0, localUpdatedAt: getUpdatedAt(), at: Date.now() })
        }
        if (!cancelled) setStatus('synced')
      } catch {
        if (!cancelled) setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [user])

  // The user picked a side in the conflict prompt.
  const resolveConflict = async (choice) => {
    if (!conflict || !user) return
    setStatus('syncing')
    try {
      if (choice === 'cloud') {
        applyPull(conflict.cloud)
        setConflict(null)
        window.location.reload()
        return
      }
      await applyPush(user.uid) // keep this device, overwrite the cloud copy
      setConflict(null)
      setStatus('synced')
    } catch {
      setStatus('error')
    }
  }

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
        applyPush(user.uid)
          .then(() => { setStatus('synced'); setLastSyncedAt(Date.now()) })
          .catch(() => setStatus('error'))
      }, 1500)
    }
    window.addEventListener('sl-data-changed', onChange)
    return () => {
      window.removeEventListener('sl-data-changed', onChange)
      clearTimeout(pushTimer.current)
    }
  }, [user])

  // A different account means a different dataset — the old marker would be a
  // lie about what this device and that cloud copy last agreed on.
  const signOut = async () => {
    clearSyncMarker()
    setConflict(null)
    setLastSyncedAt(0)
    return signOutUser()
  }

  const value = {
    configured: isFirebaseConfigured,
    user,
    status,
    syncNote,
    conflict,
    resolveConflict,
    lastSyncedAt,
    signIn: signInWithGoogle,
    signOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
