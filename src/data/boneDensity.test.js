// The bone-strength generator turns two answers into a program. Every
// combination must produce something real, safe and the length it promises.
import { describe, it, expect } from 'vitest'
import { buildBoneProgram, rebuildBoneProgram, BONE_LEVELS, BONE_TIMES, BONE_PHASES, BONE_DISCLAIMER } from './boneDensity.js'
import { EXERCISE_BY_ID, exMeasure, musclesFor } from './exercises.js'
import { estimateSessionMinutes } from '../lib/duration.js'
import { resolveExercisesForEquipment } from '../lib/equipment.js'

const COMBOS = []
for (const l of BONE_LEVELS) for (const t of BONE_TIMES) for (const p of [1, 2, 3]) COMBOS.push([l.id, t.id, p])

// Loaded spinal flexion is the one thing the osteoporosis guidance is unanimous
// about avoiding. None of these may ever appear.
const FLEXION = ['crunch', 'situp', 'sit_up', 'v_up', 'toe_touch', 'russian_twist', 'ab_crunch', 'jackknife', 'leg_raise', 'roll_up', 'good_morning', 'jefferson']

describe.each(COMBOS)('%s · %s · phase %s', (level, time, phase) => {
  const p = buildBoneProgram({ level, time, phase })
  const T = BONE_TIMES.find((t) => t.id === time)

  it('has the promised number of sessions and a valid shape', () => {
    expect(p.id).toBeUndefined()
    expect(p.days).toHaveLength(T.days)
    expect(p.boneDensity).toEqual({ level, time, phase })
    expect(p.schedule.trainingDays).toHaveLength(T.days)
  })

  it('only uses real exercises, once each per day', () => {
    for (const d of p.days) {
      const ids = d.exercises.map((e) => e.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const e of d.exercises) {
        expect(EXERCISE_BY_ID[e.id], e.id).toBeTruthy()
        for (const a of e.alts || []) expect(EXERCISE_BY_ID[a], a).toBeTruthy()
      }
    }
  })

  it('fits the time it promises', () => {
    for (const d of p.days) {
      const min = estimateSessionMinutes(d)
      expect(min).toBeGreaterThanOrEqual(T.minutes - 20)
      expect(min).toBeLessThanOrEqual(T.minutes + 5)
    }
  })

  it('keeps the LIFTMOR core on every heavy day: hinge, press with impact, squat', () => {
    for (const d of p.days.filter((x) => !x.title.includes('Balance'))) {
      const [hinge, press, impact, squat] = d.exercises
      expect(hinge.pattern).toBe('hinge')
      expect(press.pattern).toBe('vert_push')
      expect(press.supersetNext).toBe(true)
      expect(squat.pattern).toBe('squat')
      // the phase sets the main lifts' sets × reps
      for (const lift of [hinge, press, squat]) {
        expect([lift.sets, lift.repLow, lift.repHigh]).toEqual([BONE_PHASES[phase].sets, BONE_PHASES[phase].low, BONE_PHASES[phase].high])
      }
      // ~50 impacts: 5 × 10, or 5 × 5 of the bigger chin-up landing
      expect(impact.sets * impact.repHigh).toBeGreaterThanOrEqual(impact.id === 'jump_chinup_drop' ? 25 : 50)
    }
  })

  it('trains balance and the back extensors every session', () => {
    for (const d of p.days) {
      const ids = d.exercises.map((e) => e.id)
      expect(ids).toContain('prone_back_extension_hold')
      expect(ids.some((id) => ['single_leg_stance', 'single_leg_reach', 'tandem_walk'].includes(id))).toBe(true)
    }
  })

  it('never includes loaded spinal flexion', () => {
    for (const d of p.days) for (const e of d.exercises) {
      for (const bad of FLEXION) expect(e.id.includes(bad), e.id).toBe(false)
    }
  })

  it('carries the safety note on every day', () => {
    for (const d of p.days) expect(d.note).toContain(BONE_DISCLAIMER)
  })
})

describe('experience changes the program', () => {
  const lifts = (level) => buildBoneProgram({ level, time: '2x30' }).days[0].exercises.slice(0, 4).map((e) => e.id)
  it('new lifters start on dumbbells and the gentlest impact, in the technique phase', () => {
    const p = buildBoneProgram({ level: 'new', time: '2x30' })
    expect(p.boneDensity.phase).toBe(1)
    expect(lifts('new')).toEqual(['trap_bar_deadlift', 'db_shoulder_press', 'heel_drop', 'goblet_squat'])
  })
  it('experienced lifters get the full LIFTMOR protocol at 5 × 5', () => {
    const p = buildBoneProgram({ level: 'experienced', time: '2x30' })
    expect(p.boneDensity.phase).toBe(3)
    expect(lifts('experienced')).toEqual(['deadlift', 'overhead_press', 'jump_chinup_drop', 'back_squat'])
  })
})

describe('equipment fallbacks', () => {
  it('a home with only dumbbells still gets a full session', () => {
    const p = buildBoneProgram({ level: 'some', time: '2x45', phase: 2 })
    const home = resolveExercisesForEquipment(p.days[0].exercises, ['dumbbells', 'adj_bench'])
    const ids = home.map((e) => e.id)
    expect(ids).toContain('db_rdl')
    expect(ids).toContain('db_shoulder_press')
    expect(ids).toContain('goblet_squat')
  })
})

describe('moving to the next phase', () => {
  it('changes the prescription but keeps id, schedule and weights', () => {
    const start = { ...buildBoneProgram({ level: 'new', time: '2x45' }), id: 'p1', schedule: { mode: 'rotation', trainingDays: [2, 5] } }
    start.days[0].exercises[0].startWeight = '60'
    const next = rebuildBoneProgram(start, 2)
    expect(next.id).toBe('p1')
    expect(next.schedule.trainingDays).toEqual([2, 5])
    expect(next.boneDensity.phase).toBe(2)
    expect(next.days[0].exercises[0].startWeight).toBe('60')
    expect(next.days[0].exercises[0].repHigh).toBe(8)
  })
})

describe('new library entries', () => {
  const NEW = ['trap_bar_deadlift', 'split_squat', 'heel_drop', 'stomp', 'pogo_jump', 'jump_chinup_drop', 'single_leg_stance', 'tandem_walk', 'single_leg_reach', 'pallof_press', 'prone_back_extension_hold']
  it.each(NEW)('%s has muscles, cues and search aliases', (id) => {
    const ex = EXERCISE_BY_ID[id]
    expect(ex).toBeTruthy()
    expect(ex.cues.length).toBeGreaterThan(40)
    expect(musclesFor(ex).primary.length).toBeGreaterThan(0)
    expect((ex.aliases || []).length).toBeGreaterThan(0)
  })
  it('impacts are counted, balance holds are timed', () => {
    expect(exMeasure(EXERCISE_BY_ID.heel_drop).type).toBe('reps')
    expect(exMeasure(EXERCISE_BY_ID.single_leg_stance).type).toBe('time')
    expect(exMeasure(EXERCISE_BY_ID.prone_back_extension_hold).type).toBe('time')
  })
})
