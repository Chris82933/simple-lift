// Firebase is loaded lazily (dynamic import) and only when real config is
// present, so users on local-only / offline never download the SDK.
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig.js'

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
  return f.authMod.onAuthStateChanged(f.auth, cb)
}

export async function getFirestore() {
  const f = await init()
  return f ? { db: f.db, fsMod: f.fsMod } : null
}
