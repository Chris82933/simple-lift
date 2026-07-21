// 5/3/1 is percentage-based off a training max and runs on a four-week wave, so
// a wrong percentage or an off-by-one week silently prescribes the wrong weight
// for a month. Every week's numbers are checked against Wendler's published table.
import { describe, it, expect } from 'vitest'
import {
  WEEKS, weekSets, applyWeek, weekNote, evaluateProgression, trainingMaxFrom, is531,
} from './fiveThreeOne.js'

const lift = (over = {}) => ({
  id: 'back_squat', name: 'Squat', pattern: 'squat', regions: ['legs', 'core'],
  progression: { scheme: '531', week: 0, cycle: 0, tm: 300 }, ...over,
})
const press = (over = {}) => ({
  id: 'overhead_press', name: 'OHP', pattern: 'vert_push', regions: ['shoulders'],
  progression: { scheme: '531', week: 0, cycle: 0, tm: 100 }, ...over,
})
const done = (reps) => reps.map((r) => ({ reps: r, done: true }))

describe('training max', () => {
  it('is 90% of a true 1RM, not the 1RM', () => {
    expect(trainingMaxFrom(300, 'lbs')).toBe(270)
    expect(trainingMaxFrom(100, 'kg')).toBe(90)
  })

  it('is null when no max is known', () => {
    expect(trainingMaxFrom(0, 'lbs')).toBeNull()
  })
})

describe("each week's prescription", () => {
  // Wendler's table, on a 300 lb training max.
  it('week 1 is 65/75/85% for 5s', () => {
    const rows = weekSets(lift({ progression: { scheme: '531', week: 0, tm: 300 } }), 'lbs')
    expect(rows.map((r) => r.weight)).toEqual([195, 225, 255])
    expect(rows.map((r) => r.reps)).toEqual([5, 5, 5])
  })

  it('week 2 is 70/80/90% for 3s', () => {
    const rows = weekSets(lift({ progression: { scheme: '531', week: 1, tm: 300 } }), 'lbs')
    expect(rows.map((r) => r.weight)).toEqual([210, 240, 270])
    expect(rows.map((r) => r.reps)).toEqual([3, 3, 3])
  })

  it('week 3 is 75/85/95% for 5, 3, 1', () => {
    const rows = weekSets(lift({ progression: { scheme: '531', week: 2, tm: 300 } }), 'lbs')
    expect(rows.map((r) => r.weight)).toEqual([225, 255, 285])
    expect(rows.map((r) => r.reps)).toEqual([5, 3, 1])
  })

  it('week 4 is a 40/50/60% deload with no AMRAP', () => {
    const rows = weekSets(lift({ progression: { scheme: '531', week: 3, tm: 300 } }), 'lbs')
    expect(rows.map((r) => r.weight)).toEqual([120, 150, 180])
    expect(rows.some((r) => r.amrap)).toBe(false)
  })

  it('marks only the last set of a working week as AMRAP', () => {
    const rows = weekSets(lift(), 'lbs')
    expect(rows.map((r) => r.amrap)).toEqual([false, false, true])
  })

  it('rounds to loadable weights in kg', () => {
    const rows = weekSets(lift({ progression: { scheme: '531', week: 0, tm: 140 } }), 'kg')
    expect(rows.every((r) => (r.weight * 2) % 5 === 0)).toBe(true)
  })

  it('yields no weights until a training max is set', () => {
    const rows = weekSets(lift({ progression: { scheme: '531', week: 0, tm: null } }), 'lbs')
    expect(rows.every((r) => r.weight === null)).toBe(true)
  })
})

describe('applyWeek renders the session', () => {
  it('produces three sets with per-set weights and reps', () => {
    const out = applyWeek(lift({ progression: { scheme: '531', week: 2, tm: 300 } }), 'lbs')
    expect(out.sets).toBe(3)
    expect(out.setWeights).toEqual([225, 255, 285])
    expect(out.setReps).toEqual([5, 3, 1])
  })

  it('leaves non-5/3/1 exercises untouched', () => {
    const curl = { id: 'db_curl', name: 'Curl' }
    expect(applyWeek(curl, 'lbs')).toBe(curl)
    expect(is531(curl)).toBe(false)
  })

  it('describes the week in the note', () => {
    expect(weekNote(lift(), 'lbs')).toContain('5s week')
    expect(weekNote(lift({ progression: { scheme: '531', week: 3, tm: 300 } }), 'lbs')).toContain('Deload')
  })
})

describe('cycling', () => {
  it('rolls week 1 → 2 → 3 → deload without touching the training max', () => {
    let ex = lift()
    for (let i = 0; i < 3; i++) {
      const r = evaluateProgression(ex, done([5, 5, 8]), 'lbs')
      ex = { ...ex, progression: r.progression }
      expect(ex.progression.tm).toBe(300) // TM only moves at the end of a cycle
    }
    expect(ex.progression.week).toBe(3)
  })

  it('raises the training max after the deload and starts a new cycle', () => {
    const ex = lift({ progression: { scheme: '531', week: 3, cycle: 0, tm: 300 } })
    const r = evaluateProgression(ex, done([5, 5, 5]), 'lbs')
    expect(r.progression).toMatchObject({ week: 0, cycle: 1, tm: 310 }) // +10 lower body
  })

  it('adds only 5 lb to an upper-body lift', () => {
    const ex = press({ progression: { scheme: '531', week: 3, cycle: 0, tm: 100 } })
    expect(evaluateProgression(ex, done([5, 5, 5]), 'lbs').progression.tm).toBe(105)
  })

  it('uses kg steps for kg users', () => {
    const sq = lift({ progression: { scheme: '531', week: 3, cycle: 0, tm: 140 } })
    expect(evaluateProgression(sq, done([5, 5, 5]), 'kg').progression.tm).toBe(145)
    const oh = press({ progression: { scheme: '531', week: 3, cycle: 0, tm: 50 } })
    expect(evaluateProgression(oh, done([5, 5, 5]), 'kg').progression.tm).toBe(52.5)
  })

  it('says so when the AMRAP beat the target', () => {
    const r = evaluateProgression(lift(), done([5, 5, 9]), 'lbs')
    expect(r.message).toContain('well ahead')
  })

  it('says so when the AMRAP fell short, without cutting the training max', () => {
    const r = evaluateProgression(lift(), done([5, 5, 3]), 'lbs')
    expect(r.message).toContain('short of the 5 target')
    expect(r.progression.tm).toBe(300)
  })

  it('asks for a training max before doing anything else', () => {
    const ex = lift({ progression: { scheme: '531', week: 0, tm: null } })
    expect(evaluateProgression(ex, done([5, 5, 5]), 'lbs').message).toContain('training max')
  })

  it('ignores exercises that are not 5/3/1', () => {
    expect(evaluateProgression({ name: 'Curl' }, done([10]), 'lbs')).toBeNull()
  })

  it('has four weeks, the last of which is the deload', () => {
    expect(WEEKS).toHaveLength(4)
    expect(WEEKS[3].amrap).toBe(false)
  })
})
