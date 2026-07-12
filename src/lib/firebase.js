// Firebase is loaded lazily (dynamic import) and only when real config is
// present, so users on local-only / offline never download the SDK.
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig.js'
import { isIOS } from './platform.js'

let cached = null

async function init() {
  if (cached) return cached
  if (!isFirebaseConfigured) return null
  const [{ initializeApp }, authMod, fsMod] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore'),
  ])
  const app = initializeApp(firebaseConfig)
  cached = {
    auth: authMod.getAuth(app),
    db: fsMod.getFirestore(app),
    provider: new authMod.GoogleAuthProvider(),
    authMod,
    fsMod,
  }
  return cached
}

export { isFirebaseConfigured }

export async function signInWithGoogle() {
  const f = await init()
  if (!f) throw new Error('Firebase not configured')
  // Popups are unreliable inside iOS Safari / home-screen web apps — they get
  // blocked or silently closed. Use a full-page redirect there; onAuthStateChanged
  // (via getRedirectResult in subscribeAuth) completes it when the app reloads.
  if (isIOS()) return f.authMod.signInWithRedirect(f.auth, f.provider)
  return f.authMod.signInWithPopup(f.auth, f.provider)
}

export async function signOutUser() {
  const f = await init()
  if (f) await f.authMod.signOut(f.auth)
}

// Resolves to an unsubscribe function (no-op when not configured).
export async function subscribeAuth(cb) {
  const f = await init()
  if (!f) return () => {}
  // Complete a pending redirect sign-in (iOS) if we just came back from one.
  // Errors here (including "no redirect in progress") are non-fatal.
  try { await f.authMod.getRedirectResult(f.auth) } catch { /* ignore */ }
  return f.authMod.onAuthStateChanged(f.auth, cb)
}

export async function getFirestore() {
  const f = await init()
  return f ? { db: f.db, fsMod: f.fsMod } : null
}
