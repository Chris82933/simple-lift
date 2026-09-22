// 1RM estimation, working-weight derivation, warm-up ramp, and cross-lift
// interpolation — the numbers behind the "what should I lift" screens.
import { describe, it, expect } from 'vitest'
import {
  estimate1RM, weightForReps, roundTo, incrementForUnits, warmupSets,
  interpolate1RM, FORMULAS,
} from './oneRepMax.js'

describe('estimate1RM', () => {
  it('returns the weight itself for a single rep, regardless of method', () => {
    expect(estimate1RM(225, 1)).toBe(225)
    expect(estimate1RM(225, 1, 'epley')).toBe(225)
    expect(estimate1RM(225, 1, 'brzycki')).toBe(225)
  })

  it('returns 0 for missing weight/reps or fewer than 1 rep', () => {
    expect(estimate1RM(0, 5)).toBe(0)
    expect(estimate1RM(225, 0)).toBe(0)
    expect(estimate1RM(225, -1)).toBe(0)
  })

  it('matches the Epley formula exactly when that method is requested', () => {
    expect(estimate1RM(225, 5, 'epley')).toBeCloseTo(225 * (1 + 5 / 30), 6)
  })

  it('matches the Brzycki formula exactly when that method is requested', () => {
    expect(estimate1RM(225, 5, 'brzycki')).toBeCloseTo((225 * 36) / (37 - 5), 6)
  })

  it('guards Brzycki against a rep count that would divide by zero or go negative', () => {
    // 37 - reps must never hit 0 or below; the guard just returns the weight.
    expect(estimate1RM(225, 37, 'brzycki')).toBe(225)
    expect(FORMULAS.brzycki(225, 40)).toBe(225)
  })

  it('defaults to the average of Epley and Brzycki', () => {
    const avg = (FORMULAS.epley(225, 5) + FORMULAS.brzycki(225, 5)) / 2
    expect(estimate1RM(225, 5)).toBeCloseTo(avg, 6)
    expect(estimate1RM(225, 5, 'average')).toBeCloseTo(avg, 6)
  })

  it('rises monotonically with rep count for both formulas', () => {
    expect(estimate1RM(225, 8, 'epley')).toBeGreaterThan(estimate1RM(225, 5, 'epley'))
    expect(estimate1RM(225, 8, 'brzycki')).toBeGreaterThan(estimate1RM(225, 5, 'brzycki'))
  })
})

describe('weightForReps', () => {
  it('returns the 1RM itself for 1 rep', () => {
    expect(weightForReps(300, 1, 5)).toBe(300)
  })

  it('returns a lighter, rounded weight for higher reps', () => {
    const w = weightForReps(300, 10, 5)
    expect(w).toBeLessThan(300)
    expect(w % 5).toBe(0)
  })

  it('returns 0 when there is no 1RM to work from', () => {
    expect(weightForReps(0, 5, 5)).toBe(0)
  })

  it('round-trips sensibly against estimate1RM', () => {
    const oneRM = 300
    const w5 = weightForReps(oneRM, 5, 5)
    const back = estimate1RM(w5, 5)
    // Rounding to a 5 lb increment plus the %-table lookup means this is
    // approximate, not exact — but it should land close to the original.
    expect(Math.abs(back - oneRM)).toBeLessThan(oneRM * 0.05)
  })

  it('picks the closest rep-count row when the exact rep count is not tabulated', () => {
    // 11 reps sits between the 10-rep (75%) and 12-rep (70%) rows; nearest is 10.
    expect(weightForReps(300, 11, 5)).toBe(weightForReps(300, 10, 5))
  })
})

describe('roundTo', () => {
  it('rounds to the nearest increment', () => {
    expect(roundTo(183, 5)).toBe(185)
    expect(roundTo(101, 2.5)).toBe(100)
    expect(roundTo(102, 2.5)).toBe(102.5)
  })

  it('rounds to the nearest whole number when no increment is given', () => {
    expect(roundTo(182.6, 0)).toBe(183)
  })
})

describe('incrementForUnits', () => {
  it('is 5 for lbs and 2.5 for kg', () => {
    expect(incrementForUnits('lbs')).toBe(5)
    expect(incrementForUnits('kg')).toBe(2.5)
  })

  it('defaults to the lbs increment for anything unrecognized', () => {
    expect(incrementForUnits(undefined)).toBe(5)
    expect(incrementForUnits('stone')).toBe(5)
  })
})

describe('warmupSets', () => {
  it('ramps up but always stays below the working weight', () => {
    const ramp = warmupSets(225, 5)
    expect(ramp.length).toBeGreaterThan(0)
    for (const s of ramp) expect(s.weight).toBeLessThan(225)
  })

  it('is strictly ascending in weight', () => {
    const weights = warmupSets(225, 5).map((s) => s.weight)
    for (let i = 1; i < weights.length; i++) expect(weights[i]).toBeGreaterThan(weights[i - 1])
  })

  it('drops any step that would round up to meet or exceed the working weight', () => {
    // A very light working weight rounds every %-step down to 0 or up to the
    // working weight itself — none of them qualify as a valid warm-up.
    expect(warmupSets(5, 5)).toEqual([])
  })

  it('returns nothing for a zero/missing working weight', () => {
    expect(warmupSets(0, 5)).toEqual([])
    expect(warmupSets(undefined, 5)).toEqual([])
  })
})

describe('interpolate1RM', () => {
  it('estimates an untested lift from one convertible saved max', () => {
    // back_squat ratio 1, bench_press ratio 0.75 → squat-equivalent 300, ×0.75.
    const est = interpolate1RM('bench_press', { back_squat: { oneRM: 300 } })
    expect(est).toBeCloseTo(225, 6)
  })

  it('averages multiple convertible maxes before scaling to the target', () => {
    // squat-equivalents: 300/1 = 300, 400/1.2 = 333.33 → avg 316.67 × 0.75
    const est = interpolate1RM('bench_press', {
      back_squat: { oneRM: 300 },
      deadlift: { oneRM: 400 },
    })
    const expected = ((300 / 1 + 400 / 1.2) / 2) * 0.75
    expect(est).toBeCloseTo(expected, 6)
  })

  it('returns null for a lift with no strength ratio at all', () => {
    expect(interpolate1RM('bicep_curl', { back_squat: { oneRM: 300 } })).toBeNull()
  })

  it('returns null when nothing convertible is in the saved maxes', () => {
    // Only the target lift itself is saved (excluded), or an unconvertible id.
    expect(interpolate1RM('bench_press', { bench_press: { oneRM: 200 } })).toBeNull()
    expect(interpolate1RM('bench_press', { bicep_curl: { oneRM: 50 } })).toBeNull()
    expect(interpolate1RM('bench_press', {})).toBeNull()
    expect(interpolate1RM('bench_press', null)).toBeNull()
  })

  it('ignores a convertible entry with no numeric oneRM', () => {
    expect(interpolate1RM('bench_press', { back_squat: { oneRM: null } })).toBeNull()
  })
})
