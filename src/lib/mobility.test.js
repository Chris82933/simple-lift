import { describe, it, expect } from 'vitest'
import { MOVES, AREAS, GOALS, TESTS } from '../data/mobility.js'
import { EXERCISE_BY_ID, exMeasure } from '../data/exercises.js'
import { ALL_EQUIPMENT_IDS } from './equipment.js'
import {
  areasFor, areasThisSession, buildSession, buildSteps, progressMove, blockInfo, testsFor,
  testProgress, asymmetry, allowedMove, loadCap, sessionsThisWeek, weekStreak, sorenessDue, doseFor,
} from './mobility.js'

const GYM = new Set(ALL_EQUIPMENT_IDS)
const plan = (over = {}) => ({ goals: ['toe_touch'], areas: [], minutes: 25, perWeek: 3, level: 'some', flags: {}, startedAt: new Date().toISOString(), ...over })

describe('mobility data', () => {
  it('every move is a real exercise, and holds/reps match how the library measures it', () => {
    for (const [id, m] of Object.entries(MOVES)) {
      expect(EXERCISE_BY_ID[id], id).toBeTruthy()
      for (const lvl of ['new', 'some', 'flexible']) expect(m.dose[lvl], `${id} ${lvl}`).toBeTruthy()
      if (m.kind === 'reps') expect(exMeasure({ id }).type, id).toBe('reps')
    }
  })
  it('every area ladder and goal points at real things', () => {
    for (const a of AREAS) for (const id of a.ladder) expect(MOVES[id], `${a.id}: ${id}`).toBeTruthy()
    const areaIds = new Set(AREAS.map((a) => a.id))
    for (const g of GOALS) {
      for (const a of g.areas) expect(areaIds.has(a), `${g.id}: ${a}`).toBe(true)
      expect(TESTS[g.test], g.id).toBeTruthy()
    }
  })
  it('never loads the neck', () => {
    const neck = AREAS.find((a) => a.id === 'neck')
    for (const id of neck.ladder) expect(MOVES[id].loadable).toBe('none')
  })
})

describe('building a session', () => {
  it('goals expand to areas without duplicates', () => {
    expect(areasFor({ goals: ['deep_squat', 'splits'] })).toEqual(['ankles', 'hips_groin', 'hip_flexors', 'hamstrings'])
  })

  it('fits the areas to the time and rotates the rest across sessions', () => {
    const all = ['a', 'b', 'c', 'd', 'e']
    expect(areasThisSession(all, 15, 0)).toEqual(['a', 'b'])
    expect(areasThisSession(all, 15, 1)).toEqual(['c', 'd'])
    expect(areasThisSession(['a'], 40, 3)).toEqual(['a'])
  })

  it('leads every area with slow reps, then a hold, and fits roughly in the time', () => {
    for (const minutes of [15, 25, 40]) {
      const s = buildSession(plan({ goals: ['deep_squat'], minutes }), { equipment: GYM })
      expect(s.items.length).toBeGreaterThan(0)
      const firstPerArea = new Map()
      for (const it of s.items) if (!firstPerArea.has(it.area)) firstPerArea.set(it.area, it)
      for (const it of firstPerArea.values()) expect(it.kind, it.id).toBe('reps')
      expect(s.minutes).toBeLessThanOrEqual(minutes + 12)
      expect(s.minutes).toBeGreaterThan(minutes / 3)
    }
  })

  it('respects the equipment you have', () => {
    const s = buildSession(plan({ goals: ['toe_touch', 'overhead'] }), { equipment: new Set([]) })
    for (const it of s.items) expect(EXERCISE_BY_ID[it.id].requires, it.id).toEqual([])
  })

  it('quietly leaves out loaded spinal flexion for low bone density and pregnancy', () => {
    for (const flags of [{ bone: true }, { pregnant: true }]) {
      for (const level of ['new', 'some', 'flexible']) {
        const s = buildSession(plan({ goals: ['toe_touch'], level, flags, minutes: 40 }), { equipment: GYM })
        expect(s.items.map((i) => i.id), JSON.stringify(flags)).not.toContain('jefferson_curl')
      }
    }
    expect(allowedMove('jefferson_curl', { flags: {} })).toBe(true)
  })

  it('caps holds at 30 s and prefers strength in range for very bendy people', () => {
    expect(doseFor('dead_hang', { level: 'some', state: { dead_hang: { sec: 60 } }, flags: { bendy: true } }).sec).toBe(30)
    const s = buildSession(plan({ goals: ['toe_touch'], flags: { bendy: true } }), { equipment: GYM })
    for (const it of s.items) if (it.kind === 'hold') expect(it.sec).toBeLessThanOrEqual(30)
  })

  it('makes week 4 an easy week', () => {
    const start = new Date(Date.now() - 22 * 864e5).toISOString()
    expect(blockInfo(start).week).toBe(4)
    expect(blockInfo(start).easy).toBe(true)
    const easy = buildSession(plan({ startedAt: start, minutes: 40 }), { equipment: GYM })
    const normal = buildSession(plan({ minutes: 40 }), { equipment: GYM })
    expect(easy.items[0].sets).toBeLessThan(normal.items[0].sets)
  })
})

describe('player steps', () => {
  it('runs each side, switches between them, rests between sets, and asks how it felt', () => {
    const steps = buildSteps({ items: [{ id: 'cossack_squat', kind: 'reps', sets: 2, reps: 6, load: 0 }, { id: 'dead_hang', kind: 'hold', sets: 2, sec: 30, load: 0, deeper: true }] })
    const kinds = steps.map((s) => s.kind)
    expect(kinds[0]).toBe('warmup')
    expect(kinds.at(-1)).toBe('done')
    expect(steps.filter((s) => s.id === 'cossack_squat' && s.kind === 'reps').map((s) => s.side)).toEqual(['L', 'R', 'L', 'R'])
    expect(kinds.filter((k) => k === 'switch').length).toBe(2)
    expect(kinds.filter((k) => k === 'feel').length).toBe(2)
    // The last hold of a "go deeper" session is the contract-relax version.
    expect(steps.filter((s) => s.id === 'dead_hang').map((s) => s.kind)).toEqual(['hold', 'rest', 'pnf', 'feel'])
  })
  it('does not metronome a Nordic', () => {
    const steps = buildSteps({ items: [{ id: 'nordic_curl', kind: 'reps', sets: 1, reps: 3, load: 0 }] })
    expect(steps.find((s) => s.kind === 'reps').tempo).toBeNull()
  })
})

describe('progression', () => {
  it('needs two good sessions before changing anything, then changes one thing', () => {
    let st = {}
    let r = progressMove('dead_hang', st, { feel: 'good' })
    expect(r.note).toBeNull()
    r = progressMove('dead_hang', r.state, { feel: 'good' })
    expect(r.note).toBe('longer')
    expect(r.state.sec).toBeGreaterThan(40)
    st = { sec: 60 }
    r = progressMove('dead_hang', { ...st, streak: 1 }, { feel: 'good' })
    expect(r.note).toBe('heavier')
  })
  it('adds reps up to 12, then load', () => {
    let r = progressMove('db_rdl', { reps: 10, streak: 1 }, { feel: 'good', more: true })
    expect(r.state.reps).toBe(12)
    r = progressMove('db_rdl', { reps: 12, streak: 1 }, { feel: 'good', more: true })
    expect(r.note).toBe('heavier')
  })
  it('does not progress a reps move when the last reps were a grind', () => {
    const r = progressMove('db_rdl', { reps: 8, streak: 1 }, { feel: 'good', more: false })
    expect(r.note).toBeNull()
    expect(r.state.streak).toBe(0)
  })
  it('eases off after "too much", removes after sharp pain, and holds still in the easy week', () => {
    expect(progressMove('db_rdl', { load: 30 }, { feel: 'much' }).state.load).toBe(25)
    expect(progressMove('dead_hang', { sec: 45 }, { feel: 'much' }).state.sec).toBe(35)
    expect(progressMove('db_rdl', {}, { feel: 'good', sharp: true }).remove).toBe(true)
    expect(progressMove('db_rdl', { streak: 1 }, { feel: 'easy' }, { easyWeek: true }).note).toBeNull()
  })
  it('caps loaded spinal flexion at ~10% of bodyweight in the first block', () => {
    expect(loadCap('jefferson_curl', { bodyweight: 180, units: 'lbs', block: 1 })).toBe(15)
    expect(loadCap('jefferson_curl', { bodyweight: 180, units: 'lbs', block: 2 })).toBe(35)
    const r = progressMove('jefferson_curl', { reps: 8, load: 15, streak: 1 }, { feel: 'good', more: true }, { bodyweight: 180, block: 1 })
    expect(r.state.load).toBe(15)
    expect(loadCap('db_rdl')).toBe(Infinity)
  })
})

describe('self-tests', () => {
  it('picks one test per goal, at most four', () => {
    expect(testsFor({ goals: ['toe_touch', 'deep_squat', 'overhead', 'splits', 'hips'] }).length).toBe(4)
    expect(testsFor({ areas: ['ankles'] })).toEqual(['knee_wall'])
  })
  it('only calls it progress outside the day-to-day wobble', () => {
    const e = (v) => ({ d: '2026-01-01', v })
    expect(testProgress('toe_touch', [e(-4), e(-3)]).status).toBe('steady')
    expect(testProgress('toe_touch', [e(-4), e(-1)]).status).toBe('up')
    expect(testProgress('toe_touch', [e(-1), e(-4)]).status).toBe('down')
    expect(testProgress('straddle', [e(5), e(2)]).status).toBe('up') // lower is better
    expect(testProgress('overhead', [e(1), e(2)]).status).toBe('up') // a whole level
    // Both sides must improve for "real progress" on a two-sided test.
    expect(testProgress('knee_wall', [e({ L: 4, R: 4 }), e({ L: 8, R: 4 })]).status).toBe('steady')
    expect(testProgress('knee_wall', [e({ L: 4, R: 4 }), e({ L: 8, R: 7 })]).status).toBe('up')
    expect(testProgress('toe_touch', [e(-4)]).status).toBe('baseline')
  })
  it('names the tighter side only beyond the noise', () => {
    expect(asymmetry('knee_wall', { L: 5, R: 6 })).toBeNull()
    expect(asymmetry('knee_wall', { L: 3, R: 6 }).tighter).toBe('left')
    expect(asymmetry('couch', { L: 3, R: 6 }).tighter).toBe('right')
  })
})

describe('consistency', () => {
  it('counts this week and full weeks hit', () => {
    const now = new Date('2026-11-20T12:00:00').getTime() // a Friday
    const d = (s) => ({ d: new Date(s).toISOString() })
    const log = [d('2026-11-03T10:00'), d('2026-11-05T10:00'), d('2026-11-07T10:00'), d('2026-11-10T10:00'), d('2026-11-12T10:00'), d('2026-11-14T10:00'), d('2026-11-17T10:00')]
    expect(sessionsThisWeek(log, now)).toBe(1)
    expect(weekStreak(log, 3, now)).toBe(2)
  })
  it('asks about soreness once, the day after', () => {
    const last = new Date(Date.now() - 20 * 3600e3).toISOString()
    expect(sorenessDue({ log: [{ d: last }] })).toBeTruthy()
    expect(sorenessDue({ log: [{ d: last }], soreCheckedFor: last })).toBeNull()
    expect(sorenessDue({ log: [{ d: new Date().toISOString() }] })).toBeNull()
  })
})
