import { describe, it, expect } from 'vitest'
import { MOVES, AREAS, AREA_BY_ID, GOALS, TESTS, PROGRAMS, PROGRAM_BY_ID } from '../data/mobility.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { ALL_EQUIPMENT_IDS } from './equipment.js'
import {
  buildSession, buildSteps, planSignature, programExposures, programLength, programAreas, testsFor,
  sessionsThisWeek, primersThisWeek, enoughDone, doseFor, holdCapFor, loadCap, progressMove, minutesText,
} from './mobility.js'

const GYM = new Set(ALL_EQUIPMENT_IDS)
const NONE = new Set()
const plan = (id, len, over = {}) => ({ program: { id, len, day: 0 }, level: 'some', flags: {}, perWeek: 3, startedAt: new Date().toISOString(), log: [], ...over })

describe('program data', () => {
  it('every program area, test and pain move exists', () => {
    for (const p of PROGRAMS) {
      for (const t of p.tests) expect(TESTS[t], `${p.id}: ${t}`).toBeTruthy()
      for (const a of programAreas({ program: { id: p.id } })) expect(AREA_BY_ID[a], `${p.id}: ${a}`).toBeTruthy()
      for (const ids of Object.values(p.pain || {})) for (const id of ids) expect(MOVES[id], id).toBeTruthy()
    }
  })
  it('program-only areas stay out of the goals', () => {
    const only = new Set(AREAS.filter((a) => a.programOnly).map((a) => a.id))
    for (const g of GOALS) for (const a of g.areas) expect(only.has(a), `${g.id}: ${a}`).toBe(false)
  })
  it('every new move has an exercise with a cue', () => {
    for (const id of Object.keys(MOVES)) expect(EXERCISE_BY_ID[id]?.cues, id).toBeTruthy()
  })
})

describe('program sessions', () => {
  it('every length, level, day and gear fits its time and works every area it can', () => {
    for (const p of PROGRAMS) {
      for (const l of p.lengths) {
        for (const level of ['new', 'some', 'flexible']) {
          for (const gear of [GYM, NONE]) {
            l.days.forEach((d, day) => {
              const s = buildSession(plan(p.id, l.min, { level, program: { id: p.id, len: l.min, day } }), { equipment: gear, mode: l.mode })
              expect(s.minutes, `${p.id} ${l.min} ${level} d${day}`).toBeLessThanOrEqual(l.min + 2)
              expect(s.items.length).toBeGreaterThan(0)
              if (gear === GYM) for (const a of d.sections.flatMap((x) => x.areas)) expect(s.areas, `${p.id} ${l.min} ${level}: ${a}`).toContain(a)
            })
          }
        }
      }
    }
  })
  it('each area leads with its reps move', () => {
    const s = buildSession(plan('full_body', 60), { equipment: GYM })
    const seen = new Set()
    for (const it of s.items) {
      if (!seen.has(it.area)) expect(it.main, it.id).toBe(true)
      seen.add(it.area)
    }
  })
  it('30 min alternates two days', () => {
    const a = buildSession(plan('full_body', 30), { equipment: GYM })
    const b = buildSession(plan('full_body', 30, { program: { id: 'full_body', len: 30, day: 1 } }), { equipment: GYM })
    expect(a.label).toMatch(/Day A/)
    expect(b.label).toMatch(/Day B/)
    expect(a.areas).not.toEqual(b.areas)
  })
  it('caps heavy moves per session: one at 30 min and for beginners, two at 60+', () => {
    const heavyCount = (s) => s.items.filter((i) => MOVES[i.id].heavy).length
    const deep = { hamstrings: 3, hips_groin: 2, hip_flexors: 3, lower_back: 3 }
    expect(heavyCount(buildSession(plan('full_body', 30, { level: 'flexible', rungs: deep }), { equipment: GYM }))).toBeLessThanOrEqual(1)
    expect(heavyCount(buildSession(plan('full_body', 90, { level: 'flexible', rungs: deep }), { equipment: GYM }))).toBeLessThanOrEqual(2)
    expect(heavyCount(buildSession(plan('full_body', 90, { level: 'new', rungs: deep }), { equipment: GYM }))).toBeLessThanOrEqual(1)
  })
  it('one longer hold instead of several short ones', () => {
    const s = buildSession(plan('full_body', 60), { equipment: GYM })
    for (const it of s.items.filter((i) => i.kind === 'hold' && !MOVES[i.id].active)) {
      expect(it.sets).toBe(1)
      expect(it.sec).toBeGreaterThanOrEqual(Math.min(60, holdCapFor(it.id)))
    }
  })
  it('climbing never uses heavy lowering work, and forearms come last', () => {
    for (const l of PROGRAM_BY_ID.climbing.lengths) {
      const s = buildSession(plan('climbing', l.min, { level: 'flexible', rungs: { climb_turnout: 4, hamstrings: 3 } }), { equipment: GYM, mode: l.mode })
      for (const it of s.items) expect(MOVES[it.id].heavy, it.id).toBeFalsy()
      const fore = s.items.findIndex((i) => i.area === 'climb_forearms')
      if (fore >= 0) expect(s.items.slice(fore).every((i) => i.area === 'climb_forearms')).toBe(true)
    }
  })
  it('the primer: primer-safe moves, one set, short holds, light reps, one check at the end', () => {
    const s = buildSession(plan('climbing', 30), { equipment: GYM, mode: 'primer' })
    expect(s.mode).toBe('primer')
    for (const it of s.items) {
      expect(MOVES[it.id].primerOk, it.id).toBe(true)
      expect(it.sets).toBe(1)
      if (it.kind === 'hold') expect(it.sec).toBeLessThanOrEqual(20)
      expect(s.areas).not.toContain('climb_forearms')
    }
    const steps = buildSteps(s)
    expect(steps.filter((x) => x.kind === 'feel')).toHaveLength(0)
    expect(steps.filter((x) => x.kind === 'check')).toHaveLength(1)
  })
  it('after climbing: no pull-up bar (tired fingers), forearms included', () => {
    const s = buildSession(plan('climbing', 30), { equipment: GYM, mode: 'after' })
    for (const it of s.items) expect(EXERCISE_BY_ID[it.id].requires || []).not.toContain('pullup_bar')
    expect(s.areas).toContain('climb_forearms')
  })
  it('pain chips leave the matching moves out', () => {
    const s = buildSession(plan('climbing', 45, { level: 'flexible', rungs: { shoulder_control: 4 }, program: { id: 'climbing', len: 45, day: 0, pain: ['fingers', 'shoulder'] } }), { equipment: GYM })
    for (const id of ['dead_hang', 'scap_pull_up', 'hanging_leg_raise', 'cuban_rotation']) expect(s.items.map((i) => i.id)).not.toContain(id)
  })
  it('pregnant: lengths over 60 min run the 60-min session', () => {
    expect(programLength(plan('full_body', 120, { flags: { pregnant: true } })).min).toBe(60)
    const s = buildSession(plan('full_body', 120, { flags: { pregnant: true } }), { equipment: GYM })
    for (const it of s.items) expect(MOVES[it.id].noPregnancy || MOVES[it.id].heavy || MOVES[it.id].flex, it.id).toBeFalsy()
  })
  it('an injured area is left out of every day', () => {
    const s = buildSession(plan('full_body', 60, { avoidAreas: ['ankles'] }), { equipment: GYM })
    expect(s.areas).not.toContain('ankles')
    expect(s.areas.length).toBeGreaterThan(5)
  })
  it('long sessions get section cards and water breaks; a one-section day gets neither', () => {
    const steps = buildSteps(buildSession(plan('full_body', 120), { equipment: GYM }))
    expect(steps.filter((x) => x.kind === 'section')).toHaveLength(4)
    expect(steps.filter((x) => x.kind === 'break')).toHaveLength(2)
    const short = buildSteps(buildSession(plan('full_body', 30), { equipment: GYM }))
    expect(short.filter((x) => x.kind === 'section' || x.kind === 'break')).toHaveLength(0)
  })
  it('tests come from the program', () => {
    expect(testsFor(plan('climbing', 30))).toEqual(['foot_raise', 'wall_frog', 'shoulder_er', 'hip_9090'])
  })
})

describe('program bookkeeping', () => {
  it('custom plan signatures are unchanged; program signatures follow length, day and mode', () => {
    const custom = { goals: ['toe_touch'], areas: [], minutes: 25, level: 'some', flags: {} }
    expect(planSignature(custom)).toBe(JSON.stringify([custom.goals, custom.areas, undefined, 25, 'some', {}, undefined, undefined, undefined, undefined]))
    const p = plan('climbing', 30)
    expect(planSignature(p)).not.toBe(planSignature(p, 'primer'))
    expect(planSignature(p)).not.toBe(planSignature({ ...p, program: { ...p.program, day: 1 } }))
  })
  it('half the moves counts; a primer counts with one', () => {
    expect(enoughDone(10, 5)).toBe(true)
    expect(enoughDone(10, 4)).toBe(false)
    expect(enoughDone(6, 1, 'primer')).toBe(true)
  })
  it('primers and short sessions don’t count as full sessions', () => {
    const d = new Date().toISOString()
    const log = [{ d, m: [] }, { d, mode: 'primer', m: [] }, { d, short: true, m: [] }]
    expect(sessionsThisWeek(log)).toBe(1)
    expect(primersThisWeek(log)).toBe(1)
  })
  it('exposures: 30 min × 4 ≈ 2 a week per area, 60 min × 3 = 3', () => {
    expect(programExposures(plan('full_body', 30), 4)).toBe(2)
    expect(programExposures(plan('full_body', 60), 3)).toBe(3)
  })
  it('minutes read naturally past an hour', () => {
    expect(minutesText(45)).toBe('45 min')
    expect(minutesText(115)).toBe('1 h 55 min')
    expect(minutesText(120)).toBe('2 h')
  })
})

describe('safety fixes from the review', () => {
  it('Copenhagen is a short, heavy dose — no 3-set floor in long sessions', () => {
    expect(MOVES.copenhagen_hold.heavy).toBe(true)
    expect(doseFor('copenhagen_hold', { level: 'flexible', minutes: 40 }).sets).toBeLessThanOrEqual(2)
  })
  it('Jefferson curls stay at 2 sets or fewer', () => {
    expect(doseFor('jefferson_curl', { level: 'flexible', sets: { reps: 3, hold: 1 } }).sets).toBeLessThanOrEqual(2)
  })
  it('Cuban rotations and Y raises have a hard weight ceiling', () => {
    expect(loadCap('cuban_rotation', { units: 'lbs' })).toBe(8)
    const s = progressMove('cuban_rotation', { reps: 12, load: 7.5, streak: 1 }, { feel: 'good', more: true }, { units: 'lbs' })
    expect(s.state.load).toBe(7.5)
  })
  it('wall frog holds stop at 45 s', () => {
    expect(holdCapFor('wall_frog')).toBe(45)
  })
  it('the frog and compression moves are left out in pregnancy', () => {
    for (const id of ['wall_frog', 'active_frog_lift', 'pike_compression_lift', 'hanging_leg_raise']) expect(MOVES[id].noPregnancy, id).toBe(true)
  })
})
