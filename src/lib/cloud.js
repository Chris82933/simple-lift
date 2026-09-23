import { getFirestore } from './firebase.js'
import { CLOUD_DOC_LIMIT, CLOUD_WARN_AT } from './storage.js'

// ---- R1: chunked history ----
// The whole snapshot used to be written as ONE Firestore document at
// users/{uid}, and `history` grows forever — a committed daily user
// eventually outgrows Firestore's ~1 MiB single-document limit and loses
// cloud sync permanently (storage.CLOUD_DOC_LIMIT/cloudSizeInfo used to guard
// against a doomed write, but couldn't make it *keep working*).
//
// Fix: the main users/{uid} doc now holds only the small, always-current
// state (profile/programs/activeProgramId/settings/maxes/cardio/skills/
// bodyweight/customExercises/updatedAt/rev) plus `historyMeta` describing how
// history is chunked. The unbounded `history` array lives in a
// users/{uid}/history/{chunkId} subcollection, N sessions per doc.
//
// Chunk size: 200 sessions/chunk. A logged session (a handful of exercises,
// a few sets each, maybe a note) is on the order of a few hundred bytes to a
// couple KB as JSON; 200 of them is well under a few hundred KB even for
// unusually verbose sessions, leaving comfortable headroom under the 1 MiB
// Firestore ceiling per chunk.
//
// Chunk assignment is deterministic and stable: sessions are sorted oldest
// -> newest and sliced into fixed-size runs (chunk 0 = oldest 200, chunk 1 =
// the next 200, ...). That keeps almost all everyday activity (logging a new
// workout) confined to rewriting just the newest chunk. Edits/deletions
// anywhere else in history are still handled correctly (not just "the
// newest chunk") because every push recomputes all chunks from the full
// local history and only writes the ones whose content actually changed —
// detected via a cheap content hash stored alongside each chunk's metadata
// in the main doc, not by assuming position implies staleness.
export const HISTORY_CHUNK_SIZE = 200

// Non-cryptographic FNV-1a hash, used only to detect whether a chunk's
// content changed since it was last written to Firestore — not for security.
function fnv1a(str) {
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = (h * 0x01000193) >>> 0
  }
  return h.toString(36)
}

function estimateBytes(obj) {
  try {
    const json = JSON.stringify(obj)
    return typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(json).length : json.length
  } catch {
    return 0
  }
}

// Splits a flat (any-order) history array into deterministic, content-hashed
// chunks. Returns [] for empty/missing history.
function chunkHistory(history) {
  const list = Array.isArray(history) ? history : []
  // Oldest-first so chunk boundaries are stable as new sessions are added at
  // the newest end — see the module comment above.
  const sorted = list.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  const chunks = []
  for (let i = 0; i < sorted.length; i += HISTORY_CHUNK_SIZE) {
    const sessions = sorted.slice(i, i + HISTORY_CHUNK_SIZE)
    chunks.push({
      id: `h${String(chunks.length).padStart(4, '0')}`,
      sessions,
      hash: fnv1a(JSON.stringify(sessions)),
      count: sessions.length,
    })
  }
  return chunks
}

// { bytes, pct, warn, over, oversizedChunkIds } describing whether the main
// doc (post-chunking, i.e. NOT counting the bulk of history) is nearing or
// past Firestore's single-document ceiling. Mirrors storage.cloudSizeInfo()'s
// shape so existing UI wired to that shape (see AuthContext's syncNote)
// keeps working — but the number now reflects the actual constraint
// (main doc + historyMeta), not the whole ever-growing snapshot, since
// history no longer lives in that document. `oversizedChunkIds` flags any
// individual history chunk that itself would blow the limit (should never
// happen at HISTORY_CHUNK_SIZE=200 sessions, but checked as a backstop —
// e.g. someone pasting enormous notes into every set of every session in one
// chunk).
export function mainDocSizeInfo(blob) {
  const { history, ...rest } = blob || {}
  const chunks = chunkHistory(history)
  const mainDoc = {
    ...rest,
    historyMeta: {
      chunked: true,
      chunkSize: HISTORY_CHUNK_SIZE,
      chunks: chunks.map((c) => ({ id: c.id, hash: c.hash, count: c.count })),
    },
  }
  const bytes = estimateBytes(mainDoc)
  return {
    bytes,
    pct: Math.min(100, Math.round((bytes / CLOUD_DOC_LIMIT) * 100)),
    warn: bytes >= CLOUD_WARN_AT,
    over: bytes >= CLOUD_DOC_LIMIT,
    oversizedChunkIds: chunks.filter((c) => estimateBytes(c.sessions) >= CLOUD_DOC_LIMIT).map((c) => c.id),
  }
}

// Each user's small always-current state lives in one Firestore document at
// users/{uid}; their workout history lives alongside it in a chunked
// users/{uid}/history/{chunkId} subcollection (R1 — see module comment).
export async function pullCloud(uid) {
  const f = await getFirestore()
  if (!f) return null
  const { fsMod, db } = f
  const snap = await fsMod.getDoc(fsMod.doc(db, 'users', uid))
  if (!snap.exists()) return null
  const data = snap.data()

  // Backward compatibility: a legacy (pre-R1) doc wrote `history` inline and
  // has no `historyMeta`. Hand it back exactly as before — callers
  // (importData, syncDecision, summarizeSnapshot) already know how to read a
  // flat snapshot with an inline `history` array. It gets migrated up to
  // chunks automatically the next time this device pushes (pushCloud always
  // writes the chunked shape and drops the old inline field).
  if (!data.historyMeta || !Array.isArray(data.historyMeta.chunks)) {
    return data
  }

  // Chunked doc: fetch every chunk and stitch history back into the single
  // flat array the rest of the app expects — the chunk split is purely a
  // cloud.js-internal storage detail, invisible past this function.
  const chunkDocs = await Promise.all(
    data.historyMeta.chunks.map((c) => fsMod.getDoc(fsMod.doc(db, 'users', uid, 'history', c.id))),
  )
  const history = []
  for (const d of chunkDocs) {
    if (d.exists()) history.push(...(d.data().sessions || []))
  }
  // Chunks were stored oldest-first and each chunk's own sessions are also
  // oldest-first (see chunkHistory), so the concatenation above is fully
  // ascending. The rest of the app (loadHistory/appendWorkout) works
  // newest-first, so flip it back.
  history.reverse()

  // Strip the cloud-only chunk index — callers get the same flat snapshot shape
  // they always did, with history rebuilt from the chunks.
  const { historyMeta, ...rest } = data
  return { ...rest, history }
}

export async function pushCloud(uid, blob) {
  const f = await getFirestore()
  if (!f) return
  const { fsMod, db } = f
  const { history, ...rest } = blob
  const chunks = chunkHistory(history)

  // Backstop (R1): the normal growth path should never hit this now that
  // history is chunked, but refuse a write that would fail anyway rather
  // than let Firestore reject it after the fact.
  const sizeInfo = mainDocSizeInfo(blob)
  if (sizeInfo.over) {
    throw new Error(`Your saved settings/programs/etc. (not counting history) are too large to sync (${sizeInfo.pct}% of the cloud limit). Nothing was synced.`)
  }
  if (sizeInfo.oversizedChunkIds.length) {
    throw new Error('One chunk of your workout history is too large to sync on its own — this should not normally happen. Nothing was synced.')
  }

  const mainRef = fsMod.doc(db, 'users', uid)
  // Read the current cloud doc first so we know which history chunks are
  // already up there (id -> hash/count) and only (re)write the ones whose
  // content actually changed, instead of rewriting the whole history on
  // every sync. Also how a legacy inline-`history` doc is detected here.
  const existingSnap = await fsMod.getDoc(mainRef)
  const existing = existingSnap.exists() ? existingSnap.data() : null
  const existingChunks = existing?.historyMeta?.chunks || []
  const existingById = new Map(existingChunks.map((c) => [c.id, c]))

  const newIds = new Set(chunks.map((c) => c.id))
  const toWrite = chunks.filter((c) => existingById.get(c.id)?.hash !== c.hash)
  // Chunk count can shrink (e.g. deleting enough old sessions collapses the
  // last chunk away) — remove any chunk doc that's no longer part of the
  // current chunking so the subcollection doesn't accumulate orphans.
  const toDelete = existingChunks.filter((c) => !newIds.has(c.id))

  // One batch, atomic: the main doc and every changed/removed chunk land
  // together, or none of them do. THIS MUST STAY ONE BATCH. The main-doc write
  // drops the legacy inline `history` field; if it could commit while the chunk
  // writes failed (as they did when the security rules didn't cover the
  // subcollection), the cloud copy would be left with no history at all.
  // Batched together, a rejection leaves the previous cloud state untouched.
  // Covered by cloud.test.js — 'leaves the cloud copy completely untouched'. Firestore batches cap at 500 ops; that's
  // effectively unreachable here (toWrite+toDelete+1 <= existing chunk count
  // + new chunk count + 1, i.e. hundreds of thousands of sessions before
  // this would ever need splitting into multiple batches).
  const batch = fsMod.writeBatch(db)
  for (const c of toWrite) {
    batch.set(fsMod.doc(db, 'users', uid, 'history', c.id), { sessions: c.sessions, hash: c.hash, count: c.count })
  }
  for (const c of toDelete) {
    batch.delete(fsMod.doc(db, 'users', uid, 'history', c.id))
  }
  batch.set(mainRef, {
    ...rest,
    historyMeta: {
      chunked: true,
      chunkSize: HISTORY_CHUNK_SIZE,
      chunks: chunks.map((c) => ({ id: c.id, hash: c.hash, count: c.count })),
    },
  })
  await batch.commit()
}
