import { describe, it, expect } from 'vitest'
import { STRETCHES, buildStretchRoutine } from './stretches.js'

describe('stretch library', () => {
  it('every muscle has a dynamic and a static variant with a name + cue', () => {
    for (const [id, s] of Object.entries(STRETCHES)) {
      for (const phase of ['dynamic', 'static']) {
        expect(s[phase], `${id}.${phase}`).toBeTruthy()
        expect(s[phase].name).toBeTruthy()
        expect(s[phase].cue).toBeTruthy()
      }
    }
  })
})

describe('buildStretchRoutine', () => {
  it('returns the requested phase (dynamic before, static after)', () => {
    const warm = buildStretchRoutine(['chest'], 'dynamic')
    const cool = buildStretchRoutine(['chest'], 'static')
    expect(warm[0].name).toBe(STRETCHES.chest.dynamic.name)
    expect(cool[0].name).toBe(STRETCHES.chest.static.name)
  })

  it('orders head → toe and de-duplicates', () => {
    const r = buildStretchRoutine(['calves', 'chest', 'shoulders', 'chest'], 'static')
    expect(r.map((s) => s.muscle)).toEqual(['shoulders', 'chest', 'calves'])
  })

  it('folds core into the abs stretch', () => {
    const r = buildStretchRoutine(['core'], 'static')
    expect(r).toHaveLength(1)
    expect(r[0].muscle).toBe('abs')
  })

  it('ignores muscles with no stretch and returns empty for none', () => {
    expect(buildStretchRoutine(['not_a_muscle'], 'static')).toEqual([])
    expect(buildStretchRoutine([], 'dynamic')).toEqual([])
  })

  it('a push-day muscle set yields the expected stretches', () => {
    // bench/press-ish session → chest, shoulders, triceps, core
    const r = buildStretchRoutine(['chest', 'shoulders', 'triceps', 'core'], 'static')
    expect(r.map((s) => s.muscle)).toEqual(['shoulders', 'chest', 'triceps', 'abs'])
  })
})
