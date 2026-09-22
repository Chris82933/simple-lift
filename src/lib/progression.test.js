// lp (classic linear progression) and gslp (Greyskull AMRAP LP) — the two
// "extra" schemes beyond GZCLP. Increases stay opt-in suggestions; deloads
// auto-apply after a miss streak (lp) or a single missed AMRAP (gslp).
import { describe, it, expect } from 'vitest'
import { evaluateExtra, schemeIncrement, extraNote, isExtraScheme, FAIL_LIMIT } from './progression.js'

const squat = (over = {}) => ({
  name: 'Squat', pattern: 'squat', regions: ['legs', 'core'], sets: 5, repHigh: 5,
  progression: { scheme: 'lp', weight: 225, fails: 0 }, ...over,
})
const bench = (over = {}) => ({
  name: 'Bench', pattern: 'horiz_push', regions: ['chest'], sets: 5, repHigh: 5,
  progression: { scheme: 'lp', weight: 135, fails: 0 }, ...over,
})
const sets = (weight, reps, n) => Array.from({ length: n }, () => ({ weight, reps, done: true }))

describe('isExtraScheme', () => {
  it('recognizes lp and gslp, nothing else', () => {
    expect(isExtraScheme('lp')).toBe(true)
    expect(isExtraScheme('gslp')).toBe(true)
    expect(isExtraScheme('t1')).toBe(false)
    expect(isExtraScheme(undefined)).toBe(false)
  })
})

describe('lp — classic linear progression', () => {
  it('suggests the standard jump after hitting every prescribed set', () => {
    const r = evaluateExtra(squat(), sets(225, 5, 5), 'lbs')
    expect(r.kind).toBe('increase')
    expect(r.progression.fails).toBe(0)
    expect(r.suggestion.base).toBe(225)
    expect(r.suggestion.recommendedInc).toBe(10) // lower-body main lift, lbs
  })

  it('uses the smaller press jump for an upper-body lift', () => {
    const r = evaluateExtra(bench(), sets(135, 5, 5), 'lbs')
    expect(r.suggestion.recommendedInc).toBe(5)
  })

  it('uses kg increments in kg', () => {
    const sq = squat({ progression: { scheme: 'lp', weight: 100, fails: 0 } })
    expect(evaluateExtra(sq, sets(100, 5, 5), 'kg').suggestion.recommendedInc).toBe(5)
    const bn = bench({ progression: { scheme: 'lp', weight: 60, fails: 0 } })
    expect(evaluateExtra(bn, sets(60, 5, 5), 'kg').suggestion.recommendedInc).toBe(2.5)
  })

  it('holds and increments the miss streak on a missed session', () => {
    const r = evaluateExtra(squat(), sets(225, 3, 5), 'lbs') // needed 5 reps, got 3
    expect(r.kind).toBe('hold')
    expect(r.progression.fails).toBe(1)
    expect(r.progression.weight).toBe(225) // weight held, not reduced yet
    expect(r.autoNote).toContain('strike 1/3')
  })

  it('deloads 10% after three consecutive misses, then resets the streak', () => {
    let ex = squat()
    let last
    for (let i = 0; i < FAIL_LIMIT; i++) {
      last = evaluateExtra(ex, sets(225, 3, 5), 'lbs')
      ex = { ...ex, progression: last.progression }
    }
    expect(last.kind).toBe('deload')
    expect(last.progression.weight).toBe(205) // 225 × 0.9 = 202.5, rounded to 5 → 205
    expect(last.progression.fails).toBe(0)
    expect(last.autoNote).toContain('deload to 205')
  })

  it('just records the entered weight when nothing was logged yet', () => {
    const r = evaluateExtra(squat(), [{ weight: 0, reps: 0, done: false }], 'lbs')
    expect(r.kind).toBe('hold')
    expect(r.suggestion).toBeUndefined()
    expect(r.autoNote).toBeUndefined()
  })
})

describe('gslp — Greyskull AMRAP LP', () => {
  const gslpSquat = (over = {}) => ({
    name: 'Squat', pattern: 'squat', regions: ['legs', 'core'], sets: 3, repHigh: 5,
    progression: { scheme: 'gslp', weight: 225, fails: 0 }, ...over,
  })

  it('suggests the standard jump when the AMRAP set clears the target', () => {
    const logged = [...sets(225, 5, 2), { weight: 225, reps: 6, done: true }] // 6 on AMRAP, target 5
    const r = evaluateExtra(gslpSquat(), logged, 'lbs')
    expect(r.kind).toBe('increase')
    expect(r.suggestion.doubleJump).toBe(false)
    expect(r.suggestion.recommendedInc).toBe(5) // lower-body gslp jump
  })

  it('earns a double jump when the AMRAP set reaches 2x the target', () => {
    const logged = [...sets(225, 5, 2), { weight: 225, reps: 10, done: true }] // 2× target(5)
    const r = evaluateExtra(gslpSquat(), logged, 'lbs')
    expect(r.suggestion.doubleJump).toBe(true)
    expect(r.suggestion.recommendedInc).toBe(10) // double the normal 5
  })

  it('deloads 10% immediately when the AMRAP set misses the target', () => {
    const logged = [...sets(225, 5, 2), { weight: 225, reps: 3, done: true }] // short of 5
    const r = evaluateExtra(gslpSquat(), logged, 'lbs')
    expect(r.kind).toBe('deload')
    expect(r.progression.weight).toBe(205) // 225 × 0.9 rounded to 5
    expect(r.autoNote).toContain('reset to 205')
  })

  it('does not credit the AMRAP jump when too few sets overall were completed', () => {
    // priorDone only checks the *count* of done sets (>= sets-1), not which
    // ones — so with just the AMRAP set marked done, the count (1) falls
    // short of sets-1 (2) and the jump isn't credited even though the AMRAP
    // set itself blew past the target.
    const logged = [{ weight: 225, reps: 5, done: false }, { weight: 225, reps: 0, done: false }, { weight: 225, reps: 8, done: true }]
    const r = evaluateExtra(gslpSquat(), logged, 'lbs')
    expect(r.kind).toBe('deload')
  })
})

describe('schemeIncrement', () => {
  it('gslp jumps are smaller than lp jumps for the same lift', () => {
    const lower = { regions: ['legs'], pattern: 'squat' }
    const upper = { regions: ['chest'], pattern: 'horiz_push' }
    expect(schemeIncrement(lower, 'lbs', 'gslp')).toBeLessThan(schemeIncrement(lower, 'lbs', 'lp'))
    expect(schemeIncrement(upper, 'lbs', 'gslp')).toBeLessThan(schemeIncrement(upper, 'lbs', 'lp'))
  })
})

describe('extraNote', () => {
  it('describes the gslp prescription and AMRAP thresholds', () => {
    const ex = { sets: 3, repHigh: 5, progression: { scheme: 'gslp', weight: 225 } }
    const note = extraNote(ex, 'lbs')
    expect(note).toContain('Greyskull LP')
    expect(note).toContain('3×5')
    expect(note).toContain('225 lbs')
  })

  it('describes the lp prescription and shows the current miss streak', () => {
    const ex = { sets: 5, repHigh: 5, progression: { scheme: 'lp', weight: 225, fails: 2 } }
    const note = extraNote(ex, 'lbs')
    expect(note).toContain('Linear progression')
    expect(note).toContain('2/3 misses')
  })

  it('prompts for a starting weight when none is set yet', () => {
    const ex = { sets: 5, repHigh: 5, progression: { scheme: 'lp', weight: null, fails: 0 } }
    expect(extraNote(ex, 'lbs')).toContain('pick a starting weight')
  })

  it('returns null for a non-extra scheme', () => {
    expect(extraNote({ progression: { scheme: 't1' } })).toBeNull()
    expect(extraNote({})).toBeNull()
  })
})
