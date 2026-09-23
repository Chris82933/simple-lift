import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  isFirebaseConfigured, subscribeAuth, signInWithGoogle, signOutUser,
} from '../lib/firebase.js'
import { pullCloud, pushCloud, mainDocSizeInfo } from '../lib/cloud.js'
import {
  exportData, importData, getUpdatedAt, getRev, loadActiveSession,
  getSyncMarker, setSyncMarker, clearSyncMarker, syncDecision, summarizeSnapshot,
} from '../lib/storage.js'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

// R4: a shape-validation failure (importData throwing on malformed cloud
// data) and a network/Firestore failure both land in the generic 'error'
// status (kept as-is so existing UI checking `status === 'error'` still
// works), but they mean very different things to the user — one is "your
// cloud data looks corrupted", the other is "couldn't reach the server, try
// again". `syncError` carries that distinction for any UI that wants it.
// 'permission' is deliberately separate from 'network'. A Firestore rules
// rejection (FirebaseError code 'permission-denied', message "Missing or
// insufficient permissions.") means the request DID reach the server and was
// refused — telling the user it'll "sync when you're back online" is wrong,
// because waiting never fixes it. Only republishing the rules does.
const shapeErrorKind = (e) => {
  if (e instanceof Error && e.message.startsWith('That data has an unexpected shape')) return 'shape'
  if (e?.code === 'permission-denied') return 'permission'
  return 'network'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  // idle | syncing | synced | conflict | error | pull-pending (a pull/refresh
  // is ready but held back because a workout is in progress — see R4 below)
  const [status, setStatus] = useState('idle')
  const [syncNote, setSyncNote] = useState(null) // { level:'warn'|'over', pct, bytes } | null
  const [syncError, setSyncError] = useState(null) // { kind:'shape'|'permission'|'network', message } | null
  const [conflict, setConflict] = useState(null) // { cloud, local, cloudSummary } | null
  const [lastSyncedAt, setLastSyncedAt] = useState(() => getSyncMarker()?.at || 0)
  const pushTimer = useRef(null)
  // A pull that arrived while a workout session was in progress — applied
  // (and the page reloaded) once the session ends instead of yanking it away.
  const pendingPullRef = useRef(null)

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
    // R4: stash the revision each side is at alongside the existing
    // timestamps. syncDecision() only uses rev comparison when BOTH the
    // cloud blob and this marker carry finite revs on both sides — so a
    // marker written before this existed (or a legacy cloud doc with no
    // `rev`) transparently falls back to the old updatedAt-only comparison,
    // no migration needed.
    setSyncMarker({
      cloudUpdatedAt: blob.updatedAt || 0,
      localUpdatedAt: getUpdatedAt(),
      cloudRev: blob.rev,
      localRev: getRev(),
      at: Date.now(),
    })
  }
  const applyPull = (cloud) => {
    importData(cloud) // silent — does not bump updatedAt; throws on bad shape
    setSyncMarker({
      cloudUpdatedAt: cloud.updatedAt || 0,
      localUpdatedAt: getUpdatedAt(),
      cloudRev: cloud.rev,
      localRev: getRev(),
      at: Date.now(),
    })
  }

  // R4: applying a pulled/resolved cloud snapshot used to always end with a
  // hard reload. That's jarring, and — worse — if a workout is in progress
  // it throws away unsaved in-memory UI state (the active session itself is
  // stored separately from the synced snapshot, so it survives on disk, but
  // the running Workout screen's state does not). So: while a session is in
  // progress, apply nothing yet — stash the cloud snapshot and surface
  // 'pull-pending' so Settings can tell the user an update is waiting. Once
  // no session is active, applying it and reloading is safe, and status
  // makes clear a reload is about to happen.
  const finishPull = (cloud) => {
    if (loadActiveSession()) {
      pendingPullRef.current = cloud
      setStatus('pull-pending')
      return
    }
    applyPull(cloud)
    pendingPullRef.current = null
    setStatus('synced')
    window.location.reload()
  }

  // Retry a deferred pull once the workout session that blocked it ends.
  // 'sl-data-changed' fires on the write that finishes/discards a session
  // (and on plenty of unrelated writes, which just makes this a cheap no-op
  // check); the interval is a fallback for the case where the tab is simply
  // left open mid-session with no further writes.
  useEffect(() => {
    const tryFlushPendingPull = () => {
      if (!pendingPullRef.current || loadActiveSession()) return
      const cloud = pendingPullRef.current
      pendingPullRef.current = null
      applyPull(cloud)
      setStatus('synced')
      window.location.reload()
    }
    window.addEventListener('sl-data-changed', tryFlushPendingPull)
    const interval = setInterval(tryFlushPendingPull, 60000)
    return () => {
      window.removeEventListener('sl-data-changed', tryFlushPendingPull)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    ;(async () => {
      setStatus('syncing')
      setSyncError(null)
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
          finishPull(cloud)
          return
        } else {
          setSyncMarker({
            cloudUpdatedAt: cloud?.updatedAt || 0,
            localUpdatedAt: getUpdatedAt(),
            cloudRev: cloud?.rev,
            localRev: getRev(),
            at: Date.now(),
          })
        }
        if (!cancelled) setStatus('synced')
      } catch (e) {
        if (!cancelled) {
          setSyncError({ kind: shapeErrorKind(e), message: e instanceof Error ? e.message : String(e) })
          setStatus('error')
        }
      }
    })()
    return () => { cancelled = true }
  }, [user])

  // The user picked a side in the conflict prompt.
  const resolveConflict = async (choice) => {
    if (!conflict || !user) return
    setStatus('syncing')
    setSyncError(null)
    try {
      if (choice === 'cloud') {
        const cloud = conflict.cloud
        setConflict(null)
        finishPull(cloud)
        return
      }
      await applyPush(user.uid) // keep this device, overwrite the cloud copy
      setConflict(null)
      setStatus('synced')
    } catch (e) {
      setSyncError({ kind: shapeErrorKind(e), message: e instanceof Error ? e.message : String(e) })
      setStatus('error')
    }
  }

  // Push local changes up while signed in (debounced).
  useEffect(() => {
    if (!user) return
    const onChange = () => {
      // Don't fight a deferred pull: pushing local state up while a
      // pull-pending snapshot is waiting to be applied could clobber the
      // very cloud data we're about to adopt. It'll get pushed (or
      // superseded) once the pending pull resolves.
      if (pendingPullRef.current) return
      clearTimeout(pushTimer.current)
      pushTimer.current = setTimeout(() => {
        // R1: history is chunked out of the main doc now, so the only thing
        // that can hit the Firestore document ceiling is the main doc itself
        // (settings/programs/maxes/etc, not history) — see cloud.mainDocSizeInfo.
        const info = mainDocSizeInfo(exportData())
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
          .catch((e) => {
            setSyncError({ kind: shapeErrorKind(e), message: e instanceof Error ? e.message : String(e) })
            setStatus('error')
          })
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
    pendingPullRef.current = null
    setSyncError(null)
    return signOutUser()
  }

  const value = {
    configured: isFirebaseConfigured,
    user,
    status,
    syncNote,
    syncError, // { kind:'shape'|'permission'|'network', message } | null — see shapeErrorKind above
    conflict,
    resolveConflict,
    lastSyncedAt,
    signIn: signInWithGoogle,
    signOut,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
