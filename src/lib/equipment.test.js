// Equipment matching, including capacity — "I own dumbbells but not enough
// weight to load a pull-up" was previously unrepresentable, so the app kept
// prescribing weighted pull-ups to someone whose heaviest bell was 20 lb.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  isDoable, hasEnoughLoad, availableLoadFor, resolveForEquipment,
  getEquipment, saveProfileCapacity, activeCapacity,
} from './equipment.js'

const HOME = ['dumbbells', 'pullup_bar', 'bands']
const wPullup = { id: 'weighted_pullup', name: 'Weighted Pull-Up', alts: ['archer_pull', 'pullup'] }

beforeEach(() => window.localStorage.clear())

describe('gear presence (unchanged behaviour)', () => {
  it('allows an exercise whose gear you own', () => {
    expect(isDoable({ id: 'pullup' }, HOME)).toBe(true)
  })

  it('rejects one you lack gear for', () => {
    expect(isDoable({ id: 'back_squat' }, HOME)).toBe(false) // needs barbell + rack
  })

  it('is unaffected when no capacity is supplied', () => {
    expect(isDoable(wPullup, HOME)).toBe(true)
  })
})

describe('capacity', () => {
  it('rejects a weighted pull-up when you cannot hang enough', () => {
    expect(isDoable(wPullup, HOME, { capacity: { dumbbells: 15 }, units: 'lbs' })).toBe(false)
  })

  it('allows it once you can', () => {
    expect(isDoable(wPullup, HOME, { capacity: { dumbbells: 45 }, units: 'lbs' })).toBe(true)
  })

  it('treats a blank capacity as unlimited rather than as zero', () => {
    expect(hasEnoughLoad(wPullup, {}, 'lbs')).toBe(true)
    expect(hasEnoughLoad(wPullup, { plates: 0 }, 'lbs')).toBe(true)
  })

  it('converts the requirement for kg users', () => {
    // 20 lb ≈ 9 kg — a 10 kg bell clears it, a 5 kg one does not.
    expect(hasEnoughLoad(wPullup, { dumbbells: 10 }, 'kg')).toBe(true)
    expect(hasEnoughLoad(wPullup, { dumbbells: 5 }, 'kg')).toBe(false)
  })

  it('takes the best of several load sources', () => {
    expect(availableLoadFor(wPullup, { dumbbells: 15, weight_belt: 50 })).toBe(50)
  })

  it('ignores capacity for exercises that declare no minimum', () => {
    expect(isDoable({ id: 'db_row' }, HOME, { capacity: { dumbbells: 5 }, units: 'lbs' })).toBe(true)
  })
})

describe('substitution reacts to capacity', () => {
  it('swaps a weighted pull-up for an alternative when the weight is too light', () => {
    const out = resolveForEquipment(wPullup, HOME, { capacity: { dumbbells: 15 }, units: 'lbs' })
    expect(out.id).not.toBe('weighted_pullup')
    expect(out.swappedFrom).toBe('Weighted Pull-Up')
  })

  it('leaves it alone once enough weight is available', () => {
    const out = resolveForEquipment(wPullup, HOME, { capacity: { dumbbells: 45 }, units: 'lbs' })
    expect(out.id).toBe('weighted_pullup')
  })

  it('re-optimizes when the user buys heavier weights', () => {
    const light = resolveForEquipment(wPullup, HOME, { capacity: { dumbbells: 10 }, units: 'lbs' })
    const heavy = resolveForEquipment(wPullup, HOME, { capacity: { dumbbells: 60 }, units: 'lbs' })
    expect(light.id).not.toBe(heavy.id)
    expect(heavy.id).toBe('weighted_pullup')
  })
})

describe('capacity persistence', () => {
  it('defaults to empty for both profiles', () => {
    expect(getEquipment().capacity).toEqual({ gym: {}, home: {} })
  })

  it('saves per profile and reads back from the active one', () => {
    saveProfileCapacity('home', { dumbbells: 25 })
    expect(getEquipment().capacity.home).toEqual({ dumbbells: 25 })
    expect(getEquipment().capacity.gym).toEqual({})
    expect(activeCapacity()).toEqual({}) // gym is active by default
  })
})
