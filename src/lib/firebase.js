// Firebase is loaded lazily (dynamic import) and only when real config is
// present, so users on local-only / offline never download the SDK.
import { firebaseConfig, isFirebaseConfigured } from './firebaseConfig.js'

let cached = null
let loading = null

async function init() {
  if (cached) return cached
  if (!isFirebaseConfigured) return null
  if (!loading) {
    loading = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]).then(([{ initializeApp }, authMod, fsMod]) => {
      const app = initializeApp(firebaseConfig)
      cached = {
        auth: authMod.getAuth(app),
        db: fsMod.getFirestore(app),
        provider: new authMod.GoogleAuthProvider(),
        authMod,
        fsMod,
      }
      return cached
    })
  }
  return loading
}

export { isFirebaseConfigured }

// Load the SDK ahead of a sign-in tap. Safari only lets a popup open when it is
// started synchronously from the tap itself; awaiting a dynamic import first
// gets the popup blocked. The auth subscription calls this on app start.
export function preloadAuth() { return init() }

// True when the auth helper (authDomain) is served from this app's own site.
// Only then can the redirect flow work in Safari and iOS home-screen apps:
// with a different authDomain (*.firebaseapp.com) the result is read through
// a third-party iframe whose storage Safari blocks, so the user comes back
// from Google "signed in" but the app never learns it.
// https://firebase.google.com/docs/auth/web/redirect-best-practices
export function authDomainIsSameSite() {
  if (typeof location === 'undefined') return false
  return firebaseConfig.authDomain === location.hostname
}

// Errors from a popup that mean "the popup route didn't work here" rather than
// "the person changed their mind".
const POPUP_UNAVAILABLE = new Set([
  'auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/web-storage-unsupported',
])

// Sign in with Google.
//
// Popup everywhere, including iOS Safari and home-screen apps. The redirect
// flow used on iOS until now is the cause of "signs in, then immediately isn't
// signed in": with authDomain on firebaseapp.com the redirect result can't be
// read back on iOS (see authDomainIsSameSite). A popup passes its result back
// with postMessage instead. If a popup genuinely can't open here, fall back to
// redirect only when the auth helper is same-site, where redirect works.
export function signInWithGoogle() {
  const go = (f) => f.authMod.signInWithPopup(f.auth, f.provider).catch((e) => {
    if (POPUP_UNAVAILABLE.has(e?.code) && authDomainIsSameSite()) {
      return f.authMod.signInWithRedirect(f.auth, f.provider)
    }
    throw e
  })
  // Synchronous from the tap when the SDK is already loaded (it normally is).
  if (cached) return go(cached)
  return init().then((f) => {
    if (!f) throw new Error('Firebase not configured')
    return go(f)
  })
}

export async function signOutUser() {
  const f = await init()
  if (f) await f.authMod.signOut(f.auth)
}

// Resolves to an unsubscribe function (no-op when not configured).
// `onError` receives a failed redirect sign-in — it used to be swallowed, so a
// sign-in that didn't take looked like nothing at all had happened.
export async function subscribeAuth(cb, onError) {
  const f = await init()
  if (!f) return () => {}
  // Listen FIRST: a saved session is restored straight away, instead of
  // waiting behind the redirect check's network round trip.
  const unsub = f.authMod.onAuthStateChanged(f.auth, cb)
  f.authMod.getRedirectResult(f.auth).catch((e) => onError?.(e))
  return unsub
}

export async function getFirestore() {
  const f = await init()
  return f ? { db: f.db, fsMod: f.fsMod } : null
}
