// Isometrics: the new hold exercises exist, and the per-program `iso` toggle
// turns any rep-based lift into a timed hold without a separate library entry.
import { describe, it, expect } from 'vitest'
import { EXERCISE_BY_ID, exMeasure, measureUnit, isoHoldFor, ISO_HOLDS } from './exercises.js'

describe('isometric hold exercises', () => {
  it.each([
    'hollow_body_hold', 'glute_bridge_hold', 'hip_thrust_hold', 'spanish_squat',
    'iso_split_squat_hold', 'calf_raise_hold', 'overhead_hold', 'pushup_hold',
    'copenhagen_hold', 'iso_mid_thigh_pull',
  ])('%s is in the library and measured in time', (id) => {
    const ex = EXERCISE_BY_ID[id]
    expect(ex).toBeTruthy()
    expect(exMeasure(ex).type).toBe('time')
    expect(measureUnit(ex)).toBe('sec')
  })

  it('loaded isometrics keep their load (weight × time)', () => {
    // A mid-thigh pull and an overhead hold track weight; a plank-style hold does not.
    expect(EXERCISE_BY_ID.iso_mid_thigh_pull.load).toBe(true)
    expect(EXERCISE_BY_ID.overhead_hold.load).not.toBe(false)
    expect(EXERCISE_BY_ID.hollow_body_hold.load).toBe(false)
  })
})

describe('the iso toggle on a normal lift', () => {
  const pulldown = () => ({ id: 'lat_pulldown', name: 'Lat Pulldown', sets: 3, repLow: 8, repHigh: 12 })

  it('a lat pulldown is reps by default', () => {
    expect(exMeasure(pulldown()).type).toBe('reps')
  })

  it('becomes a timed hold when the entry is flagged iso', () => {
    const held = { ...pulldown(), iso: true }
    expect(exMeasure(held)).toEqual({ type: 'time', unit: 'sec' })
    expect(measureUnit(held)).toBe('sec')
  })

  it('does not change the library exercise itself', () => {
    // The flag lives on the program entry, so the shared library stays rep-based.
    expect(exMeasure({ id: 'lat_pulldown' }).type).toBe('reps')
  })

  it('a distance move ignores the iso flag (you cannot hold a run)', () => {
    expect(exMeasure({ id: 'run_10k', iso: true }).type).toBe('distance')
  })
})

describe('iso-hold position guidance', () => {
  it('has where-to-hold guidance for common lifts', () => {
    for (const id of ['pullup', 'back_squat', 'bench_press', 'deadlift', 'db_curl', 'hip_thrust']) {
      expect(isoHoldFor(id)).toBeTruthy()
      expect(typeof isoHoldFor(id)).toBe('string')
    }
  })

  it('returns null for a lift with no guidance', () => {
    expect(isoHoldFor('run_10k')).toBeNull()
    expect(isoHoldFor('not_a_real_id')).toBeNull()
  })

  it('every guided id is a real library exercise', () => {
    for (const id of Object.keys(ISO_HOLDS)) {
      expect(EXERCISE_BY_ID[id]).toBeTruthy()
    }
  })
})
