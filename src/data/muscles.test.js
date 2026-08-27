// Every exercise resolves to sensible target muscles — pattern defaults for the
// bulk, explicit overrides where a pattern default would be wrong.
import { describe, it, expect } from 'vitest'
import { EXERCISES, EXERCISE_BY_ID, musclesFor, PATTERN_MUSCLES } from './exercises.js'

const KNOWN = new Set([
  'chest', 'shoulders', 'triceps', 'biceps', 'forearms', 'lats', 'traps', 'lower_back',
  'abs', 'obliques', 'core', 'glutes', 'quads', 'hamstrings', 'calves', 'tibialis', 'neck',
])

describe('musclesFor — pattern defaults', () => {
  it('bench press hits chest (secondary shoulders + triceps)', () => {
    const m = musclesFor(EXERCISE_BY_ID.bench_press)
    expect(m.primary).toContain('chest')
    expect(m.secondary).toEqual(expect.arrayContaining(['shoulders', 'triceps']))
  })
  it('a squat hits quads + glutes', () => {
    expect(musclesFor(EXERCISE_BY_ID.back_squat).primary).toEqual(expect.arrayContaining(['quads', 'glutes']))
  })
  it('a pull-up hits the lats', () => {
    expect(musclesFor(EXERCISE_BY_ID.pullup).primary).toContain('lats')
  })
})

describe('musclesFor — overrides fix wrong pattern defaults', () => {
  it.each([
    ['db_shrug', 'traps'], ['wrist_curl', 'forearms'], ['glute_bridge', 'glutes'],
    ['chin_tuck', 'neck'], ['leg_extension', 'quads'], ['leg_curl', 'hamstrings'],
    ['tibialis_raise', 'tibialis'], ['face_pull', 'shoulders'], ['russian_twist', 'obliques'],
  ])('%s → primary includes %s', (id, muscle) => {
    expect(EXERCISE_BY_ID[id], id).toBeTruthy()
    expect(musclesFor(EXERCISE_BY_ID[id]).primary).toContain(muscle)
  })
})

describe('musclesFor — resolution forms', () => {
  it('accepts an id string and a bare pattern object', () => {
    expect(musclesFor('bench_press').primary).toContain('chest')
    expect(musclesFor({ pattern: 'biceps' }).primary).toContain('biceps')
  })
  it('an entry that carries only a pattern still resolves', () => {
    expect(musclesFor({ id: 'back_squat', pattern: 'squat', load: true }).primary).toContain('quads')
  })
})

describe('data integrity', () => {
  it('every exercise resolves only to known muscle ids', () => {
    for (const ex of EXERCISES) {
      const m = musclesFor(ex)
      for (const id of [...m.primary, ...m.secondary]) {
        expect(KNOWN.has(id), `${ex.id} → unknown muscle "${id}"`).toBe(true)
      }
    }
  })
  it('every movement pattern in the library has a default muscle map', () => {
    for (const ex of EXERCISES) {
      // Either an override applies, or the pattern must be mapped.
      const hasDefault = !!PATTERN_MUSCLES[ex.pattern]
      const m = musclesFor(ex)
      const hasAny = m.primary.length > 0 || m.secondary.length > 0
      expect(hasDefault || hasAny, `${ex.id} (${ex.pattern}) has no muscles`).toBe(true)
    }
  })
})
