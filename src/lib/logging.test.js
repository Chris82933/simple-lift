import { describe, it, expect } from 'vitest'
import { lastWeightFromHistory, fillDownRows } from './logging.js'

describe('lastWeightFromHistory', () => {
  const hist = [
    // newest first
    { entries: [
      { exerciseId: 'back_squat', sets: [{ weight: 205, reps: 5, done: true }, { weight: 205, reps: 5, done: true }] },
      { exerciseId: 'reverse_lunge', sets: [{ weight: 40, reps: 10, done: true }] },
      { exerciseId: 'plank', sets: [{ weight: 0, reps: 45, done: true }] },
    ] },
    { entries: [
      { exerciseId: 'back_squat', sets: [{ weight: 185, reps: 5, done: true }] },
    ] },
  ]

  it('takes the most recent loaded working weight per lift', () => {
    const map = lastWeightFromHistory(hist)
    expect(map.back_squat).toBe(205) // newest session wins over the older 185
    expect(map.reverse_lunge).toBe(40)
  })

  it('skips bodyweight sets (weight 0) so pure bodyweight moves stay blank', () => {
    expect(lastWeightFromHistory(hist).plank).toBeUndefined()
  })

  it('ignores warm-ups and unfinished sets', () => {
    const map = lastWeightFromHistory([{ entries: [{ exerciseId: 'bench', sets: [
      { weight: 95, reps: 5, done: true, warmup: true }, // warm-up ignored
      { weight: 135, reps: 5, done: false }, // not done ignored
      { weight: 155, reps: 5, done: true }, // this one counts
    ] }] }])
    expect(map.bench).toBe(155)
  })

  it('returns an empty map for no history', () => {
    expect(lastWeightFromHistory()).toEqual({})
    expect(lastWeightFromHistory([])).toEqual({})
  })
})

describe('fillDownRows', () => {
  it('copies the first working set into later not-done working sets', () => {
    const rows = [
      { weight: '135', reps: '5', done: false },
      { weight: '', reps: '5', done: false },
      { weight: '', reps: '5', done: false },
    ]
    const out = fillDownRows(rows)
    expect(out.map((r) => r.weight)).toEqual(['135', '135', '135'])
  })

  it('leaves warm-ups and already-completed sets untouched', () => {
    const rows = [
      { weight: '95', reps: '5', done: false, warmup: true }, // warm-up: skipped as source, untouched
      { weight: '135', reps: '5', done: false }, // first working set = source
      { weight: '225', reps: '3', done: true }, // done: keep the real logged value
      { weight: '', reps: '5', done: false }, // gets filled
    ]
    const out = fillDownRows(rows)
    expect(out[0]).toBe(rows[0]) // warm-up unchanged (same ref)
    expect(out[2].weight).toBe('225') // completed set preserved
    expect(out[3].weight).toBe('135') // empty set filled from set 1
  })

  it('is a no-op when there are no working sets', () => {
    const rows = [{ weight: '95', reps: '5', done: false, warmup: true }]
    expect(fillDownRows(rows)).toBe(rows)
  })
})
