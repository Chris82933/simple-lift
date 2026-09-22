// Plate-math coverage: the greedy loader has to be exactly right (a wrong
// plate call is the kind of bug a lifter notices mid-set), and the floats
// involved (2.5 lb / 1.25 kg plates) are exactly the kind that produce
// 0.30000000000004-style artifacts if the rounding isn't careful.
import { describe, it, expect, afterEach } from 'vitest'
import { calculatePlates, lazyWarmupSets, smallestBarJump, isBarbellLift } from './plates.js'

const LBS = [45, 35, 25, 10, 5, 2.5]
const KG = [25, 20, 15, 10, 5, 2.5, 1.25]

describe('calculatePlates', () => {
  it('is bar-only when the target is at or below the bar', () => {
    expect(calculatePlates(45, 45, LBS)).toMatchObject({ perSide: [], leftover: 0, exact: true, total: 45, barOnly: true })
    expect(calculatePlates(35, 45, LBS)).toMatchObject({ barOnly: true, total: 45 })
  })

  it('fills a clean target exactly with the biggest plates first', () => {
    const r = calculatePlates(225, 45, LBS)
    expect(r.perSide).toEqual([45, 45])
    expect(r.exact).toBe(true)
    expect(r.leftover).toBe(0)
    expect(r.total).toBe(225)
  })

  it('reports an honest leftover when the target is not exactly loadable', () => {
    // (224 - 45) / 2 = 89.5 per side — not reachable with these plates.
    const r = calculatePlates(224, 45, LBS)
    expect(r.perSide).toEqual([45, 35, 5, 2.5])
    expect(r.exact).toBe(false)
    expect(r.leftover).toBe(2)
    expect(r.total).toBe(220)
  })

  it('respects a restricted available-plate set', () => {
    // Only 45s and 25s on hand — no 35/10/5/2.5.
    const r = calculatePlates(200, 45, [45, 25])
    expect(r.perSide).toEqual([45, 25])
    expect(r.exact).toBe(false)
    expect(r.leftover).toBe(7.5)
  })

  it('never produces floating-point artifacts on fractional (kg-ish) targets', () => {
    const r = calculatePlates(102.5, 20, KG)
    expect(r.perSide).toEqual([25, 15, 1.25])
    expect(r.leftover).toBe(0) // not 0.00000000000004 or similar
    expect(r.exact).toBe(true)
    expect(r.total).toBe(102.5)
  })

  it('handles a lone 2.5 lb plate cleanly without drifting', () => {
    // (50 - 45) / 2 = 2.5 lb per side — exactly one small plate.
    const r = calculatePlates(50, 45, LBS)
    expect(r.perSide).toEqual([2.5])
    expect(r.leftover).toBe(0)
    expect(r.exact).toBe(true)
  })

  it('reports leftover rather than a fractional plate when nothing small enough is available', () => {
    const r = calculatePlates(46, 45, LBS.filter((w) => w >= 5)) // no 2.5s
    expect(r.perSide).toEqual([])
    expect(r.leftover).toBe(0.5)
    expect(r.exact).toBe(false)
  })
})

describe('lazyWarmupSets', () => {
  it('returns nothing at or barely above the bar', () => {
    expect(lazyWarmupSets(45, { bar: 45, availableWeights: LBS })).toEqual([])
    // 46 lb needs a 0.5 lb per-side plate that doesn't exist — nothing loadable.
    expect(lazyWarmupSets(46, { bar: 45, availableWeights: LBS })).toEqual([])
  })

  it('builds a strictly increasing, strictly sub-working-weight ramp', () => {
    const ramp = lazyWarmupSets(225, { bar: 45, availableWeights: LBS })
    expect(ramp.length).toBeGreaterThan(0)
    const weights = ramp.map((s) => s.weight)
    for (const w of weights) expect(w).toBeLessThan(225)
    for (let i = 1; i < weights.length; i++) expect(weights[i]).toBeGreaterThan(weights[i - 1])
  })

  it('every ramp step is actually loadable with the given plates', () => {
    const ramp = lazyWarmupSets(225, { bar: 45, availableWeights: LBS })
    for (const { weight } of ramp) {
      // (weight - bar) / 2 must land on a sum of available per-side plates —
      // calculatePlates coming back exact is a good proxy for "loadable".
      const r = calculatePlates(weight, 45, LBS)
      expect(r.exact || r.barOnly).toBe(true)
    }
  })

  it('caps the number of warm-up steps even when many plates go on', () => {
    const ramp = lazyWarmupSets(500, { bar: 45, availableWeights: LBS })
    expect(ramp.length).toBeLessThanOrEqual(4)
    const weights = ramp.map((s) => s.weight)
    for (let i = 1; i < weights.length; i++) expect(weights[i]).toBeGreaterThan(weights[i - 1])
    expect(Math.max(...weights)).toBeLessThan(500)
  })

  it('gives fewer reps as the ramp gets heavier', () => {
    const ramp = lazyWarmupSets(225, { bar: 45, availableWeights: LBS })
    for (let i = 1; i < ramp.length; i++) expect(ramp[i].reps).toBeLessThanOrEqual(ramp[i - 1].reps)
  })
})

describe('smallestBarJump', () => {
  afterEach(() => window.localStorage.clear())

  it('is twice the lightest available plate', () => {
    window.localStorage.setItem('simple-lift:settings', JSON.stringify({ plates: { available: {
      lbs: { 45: true, 35: true, 25: true, 10: true, 5: true, 2.5: true },
    } } }))
    expect(smallestBarJump('lbs')).toBe(5) // 2.5 × 2
  })

  it('rises when the smallest plate is unavailable', () => {
    window.localStorage.setItem('simple-lift:settings', JSON.stringify({ plates: { available: {
      lbs: { 45: true, 35: true, 25: true, 10: true, 5: true, 2.5: false },
    } } }))
    expect(smallestBarJump('lbs')).toBe(10) // smallest owned is 5
  })

  it('falls back to 0 (no constraint) when nothing is available', () => {
    window.localStorage.setItem('simple-lift:settings', JSON.stringify({ plates: { available: {
      lbs: Object.fromEntries(LBS.map((w) => [w, false])),
    } } }))
    expect(smallestBarJump('lbs')).toBe(0)
  })
})

describe('isBarbellLift', () => {
  it('is true for lifts that require a barbell', () => {
    expect(isBarbellLift({ requires: ['barbell', 'rack'] })).toBe(true)
  })

  it('is false for everything else', () => {
    expect(isBarbellLift({ requires: ['pullup_bar'] })).toBe(false)
    expect(isBarbellLift({})).toBe(false)
    expect(isBarbellLift(undefined)).toBe(false)
  })
})
