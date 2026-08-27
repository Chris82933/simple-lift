import { describe, it, expect } from 'vitest'
import { sessionMuscleHeat } from './muscleHeat.js'

const doneSet = (reps = 5) => ({ done: true, reps, weight: 100 })

describe('sessionMuscleHeat', () => {
  it('scores primary muscles full and secondary at half, normalized to the max', () => {
    const entries = [
      { exerciseId: 'bench_press', sets: [doneSet(), doneSet(), doneSet()] }, // chest ×3, shoulders/triceps ×1.5
      { exerciseId: 'back_squat', sets: [doneSet(), doneSet(), doneSet()] },  // quads/glutes ×3, hams/core/lower ×1.5
    ]
    const heat = sessionMuscleHeat(entries)
    expect(heat.chest).toBe(1)
    expect(heat.quads).toBe(1)
    expect(heat.glutes).toBe(1)
    expect(heat.shoulders).toBeCloseTo(0.5)
    expect(heat.triceps).toBeCloseTo(0.5)
    expect(heat.hamstrings).toBeCloseTo(0.5)
  })

  it('a muscle hit as both primary and secondary accumulates across exercises', () => {
    const entries = [
      { exerciseId: 'overhead_press', sets: [doneSet(), doneSet()] }, // shoulders ×2 (primary)
      { exerciseId: 'bench_press', sets: [doneSet(), doneSet()] },    // shoulders ×1 (secondary 0.5×2)
    ]
    const heat = sessionMuscleHeat(entries)
    // shoulders = 2 + 1 = 3, the max → 1
    expect(heat.shoulders).toBe(1)
    expect(heat.chest).toBeCloseTo(2 / 3) // chest primary ×2 of max 3
  })

  it('ignores warm-ups, undone sets, and zero-rep sets', () => {
    const entries = [
      { exerciseId: 'db_curl', sets: [
        { done: true, reps: 5, warmup: true }, { done: false, reps: 5 }, { done: true, reps: 0 },
      ] },
    ]
    expect(sessionMuscleHeat(entries)).toEqual({})
  })

  it('returns an empty map for no completed work', () => {
    expect(sessionMuscleHeat([])).toEqual({})
    expect(sessionMuscleHeat()).toEqual({})
  })

  it('every heat value sits in (0, 1]', () => {
    const entries = [
      { exerciseId: 'deadlift', sets: [doneSet(), doneSet()] },
      { exerciseId: 'plank', sets: [doneSet(30)] },
      { exerciseId: 'pullup', sets: [doneSet(8), doneSet(8)] },
    ]
    for (const v of Object.values(sessionMuscleHeat(entries))) {
      expect(v).toBeGreaterThan(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })
})
