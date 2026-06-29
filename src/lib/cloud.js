import { getFirestore } from './firebase.js'

// Each user's data lives in a single Firestore document at users/{uid}.
export async function pullCloud(uid) {
  const f = await getFirestore()
  if (!f) return null
  const snap = await f.fsMod.getDoc(f.fsMod.doc(f.db, 'users', uid))
  return snap.exists() ? snap.data() : null
}

export async function pushCloud(uid, blob) {
  const f = await getFirestore()
  if (!f) return
  await f.fsMod.setDoc(f.fsMod.doc(f.db, 'users', uid), blob)
}
