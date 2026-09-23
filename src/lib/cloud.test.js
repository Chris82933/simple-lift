import { describe, it, expect, beforeEach, vi } from 'vitest'

// A minimal in-memory stand-in for the bits of the Firestore SDK cloud.js uses.
// `commitError` lets a test simulate a rules rejection (the real regression:
// history moved to a users/{uid}/history subcollection that the shipped
// security rules didn't cover, so every chunk write came back permission-denied).
const state = {
  mainDoc: null,
  chunks: new Map(),
  commitError: null,
  batches: [],
}

vi.mock('./firebase.js', () => ({
  getFirestore: async () => {
    const doc = (_db, ...path) => ({ path: path.join('/') })
    const getDoc = async (ref) => {
      const stored = ref.path === 'users/u1' ? state.mainDoc : state.chunks.get(ref.path)
      return { exists: () => stored != null, data: () => stored }
    }
    const writeBatch = () => {
      const ops = []
      const batch = {
        ops,
        set: (ref, data) => ops.push({ type: 'set', path: ref.path, data }),
        delete: (ref) => ops.push({ type: 'delete', path: ref.path }),
        commit: async () => {
          // Firestore rejects a batch as a unit: if any op is denied, NOTHING
          // in it is applied. Model that exactly — it is the property the
          // no-data-loss guarantee rests on.
          if (state.commitError) throw state.commitError
          for (const op of ops) {
            if (op.type === 'delete') {
              state.chunks.delete(op.path)
            } else if (op.path === 'users/u1') {
              state.mainDoc = op.data
            } else {
              state.chunks.set(op.path, op.data)
            }
          }
        },
      }
      state.batches.push(batch)
      return batch
    }
    return { db: {}, fsMod: { doc, getDoc, writeBatch } }
  },
}))

const { pushCloud, pullCloud, HISTORY_CHUNK_SIZE } = await import('./cloud.js')

const session = (n) => ({ date: `2026-01-${String((n % 28) + 1).padStart(2, '0')}T0${n % 9}:00:00.000Z`, entries: [] })
const makeBlob = (count) => ({
  profile: { name: 'x' },
  settings: { units: 'lbs' },
  history: Array.from({ length: count }, (_, i) => session(i)),
})

beforeEach(() => {
  state.mainDoc = null
  state.chunks = new Map()
  state.commitError = null
  state.batches = []
})

describe('pushCloud batching', () => {
  it('writes the main doc and every history chunk in ONE atomic batch', async () => {
    await pushCloud('u1', makeBlob(HISTORY_CHUNK_SIZE + 50))

    expect(state.batches).toHaveLength(1)
    const paths = state.batches[0].ops.map((o) => o.path)
    // The main doc must travel WITH the chunks. Splitting them across batches
    // would let the main doc (which drops the legacy inline `history`) land
    // while the chunks fail — destroying history in the cloud.
    expect(paths).toContain('users/u1')
    expect(paths).toContain('users/u1/history/h0000')
    expect(paths).toContain('users/u1/history/h0001')
  })

  it('leaves the cloud copy completely untouched when the batch is rejected', async () => {
    // A legacy (pre-chunking) doc with history stored inline.
    const legacy = { profile: { name: 'x' }, history: [session(1), session(2)] }
    state.mainDoc = legacy

    const denied = Object.assign(new Error('Missing or insufficient permissions.'), { code: 'permission-denied' })
    state.commitError = denied

    await expect(pushCloud('u1', makeBlob(10))).rejects.toThrow(/permissions/i)

    // The exact regression scenario: the push failed, so the legacy inline
    // history must still be there and no chunk may have been created.
    expect(state.mainDoc).toBe(legacy)
    expect(state.mainDoc.history).toHaveLength(2)
    expect(state.chunks.size).toBe(0)
  })
})

describe('pullCloud', () => {
  it('reads a legacy inline-history doc unchanged', async () => {
    state.mainDoc = { profile: { name: 'x' }, history: [session(3), session(4)] }
    const out = await pullCloud('u1')
    expect(out.history).toHaveLength(2)
    expect(out.historyMeta).toBeUndefined()
  })

  it('stitches chunked history back into one newest-first array', async () => {
    const count = HISTORY_CHUNK_SIZE + 25
    await pushCloud('u1', makeBlob(count))

    const out = await pullCloud('u1')
    expect(out.history).toHaveLength(count)
    // The rest of the app works newest-first.
    expect(out.history[0].date >= out.history[out.history.length - 1].date).toBe(true)
    // The chunk index is an internal storage detail and must not leak out.
    expect(out.historyMeta).toBeUndefined()
  })

  it('round-trips without losing sessions', async () => {
    const blob = makeBlob(HISTORY_CHUNK_SIZE * 2 + 7)
    await pushCloud('u1', blob)
    const out = await pullCloud('u1')
    expect(out.history).toHaveLength(blob.history.length)
  })
})
