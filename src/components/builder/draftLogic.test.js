import { describe, it, expect } from 'vitest'
import { exerciseErrors, reorderDays, reorderExercises, toggle } from './draftLogic.js'

const ok = { sets: 3, repLow: 8, repHigh: 12, restSec: 90 }

describe('exerciseErrors', () => {
  it('accepts a normal entry', () => {
    expect(exerciseErrors(ok)).toEqual({})
  })

  it('rejects rather than clamps a zero/blank/garbage set count', () => {
    // The whole point: an invalid number must surface as an error that blocks
    // Save, never get silently rewritten into a fabricated default.
    expect(exerciseErrors({ ...ok, sets: 0 }).sets).toBeTruthy()
    expect(exerciseErrors({ ...ok, sets: '' }).sets).toBeTruthy()
    expect(exerciseErrors({ ...ok, sets: 'abc' }).sets).toBeTruthy()
  })

  it('allows zero rest but not negative rest', () => {
    expect(exerciseErrors({ ...ok, restSec: 0 }).restSec).toBeUndefined()
    expect(exerciseErrors({ ...ok, restSec: -1 }).restSec).toBeTruthy()
  })

  it('flags an inverted rep range only when both ends are otherwise valid', () => {
    expect(exerciseErrors({ ...ok, repLow: 12, repHigh: 8 }).repRange).toBeTruthy()
    expect(exerciseErrors({ ...ok, repLow: 0, repHigh: 8 }).repRange).toBeUndefined()
  })

  it('accepts a single-number range', () => {
    expect(exerciseErrors({ ...ok, repLow: 5, repHigh: 5 })).toEqual({})
  })
})

describe('reorderExercises', () => {
  const list = () => [
    { id: 'a', supersetNext: true },
    { id: 'b' },
    { id: 'c', supersetNext: true },
    { id: 'd' },
  ]

  it('moves the entry', () => {
    expect(reorderExercises(list(), 0, 2).map((e) => e.id)).toEqual(['b', 'c', 'a', 'd'])
    expect(reorderExercises(list(), 3, 0).map((e) => e.id)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('is a swap for an adjacent move, exactly like the ▲▼ buttons were', () => {
    expect(reorderExercises(list(), 1, 2).map((e) => e.id)).toEqual(['a', 'c', 'b', 'd'])
  })

  it('clears the superset links a reorder could corrupt', () => {
    // a—b was a superset pair; moving b away must not leave a pointing at
    // whatever slid into the gap.
    const out = reorderExercises(list(), 1, 3)
    expect(out.map((e) => e.supersetNext)).toEqual([undefined, undefined, undefined, undefined])
  })

  it('leaves links outside the disturbed range alone', () => {
    const long = [
      { id: 'a' }, { id: 'b' }, { id: 'c', supersetNext: true }, { id: 'd' },
      { id: 'e' }, { id: 'f' },
    ]
    const out = reorderExercises(long, 0, 1)
    expect(out.find((e) => e.id === 'c').supersetNext).toBe(true)
  })

  it('is a no-op for an out-of-range or same-slot move', () => {
    const l = list()
    expect(reorderExercises(l, 1, 1)).toBe(l)
    expect(reorderExercises(l, 0, 9)).toBe(l)
    expect(reorderExercises(l, -1, 0)).toBe(l)
  })
})

describe('reorderDays', () => {
  it('moves the whole day object, weekday and contents included', () => {
    const days = [
      { title: 'Push', weekday: 1, exercises: [{ id: 'bench' }] },
      { title: 'Legs', weekday: 3, exercises: [] },
    ]
    const out = reorderDays(days, 1, 0)
    expect(out[0].title).toBe('Legs')
    expect(out[0].weekday).toBe(3)
    expect(out[1].exercises).toEqual([{ id: 'bench' }])
  })

  it('is a no-op for a same-slot or out-of-range move', () => {
    const days = [{ title: 'a' }, { title: 'b' }]
    expect(reorderDays(days, 0, 0)).toBe(days)
    expect(reorderDays(days, 0, 5)).toBe(days)
  })
})

describe('toggle', () => {
  it('adds and removes', () => {
    expect(toggle(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggle(['a', 'b'], 'a')).toEqual(['b'])
  })
})
