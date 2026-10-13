// The bone-strength generator turns two answers into a program. Every
// combination must produce something real, safe and the length it promises.
import { describe, it, expect } from 'vitest'
import { buildBoneProgram, rebuildBoneProgram, BONE_LEVELS, BONE_TIMES, BONE_PHASES, BONE_DAY_SAFETY } from './boneDensity.js'
import { EXERCISE_BY_ID, exMeasure, musclesFor } from './exercises.js'
import { estimateSessionMinutes } from '../lib/duration.js'
import { resolveExercisesForEquipment } from '../lib/equipment.js'

const COMBOS = []
for (const l of BONE_LEVELS) for (const t of BONE_TIMES) for (const p of [1, 2, 3]) for (const li of [false, true]) COMBOS.push([l.id, t.id, p, li])

// Loaded spinal flexion is the one thing the osteoporosis guidance is unanimous
// about avoiding. None of these may ever appear.
const FLEXION = ['crunch', 'situp', 'sit_up', 'v_up', 'toe_touch', 'russian_twist', 'ab_crunch', 'jackknife', 'leg_raise', 'roll_up', 'good_morning', 'jefferson']

describe.each(COMBOS)('%s · %s · phase %s · low-impact %s', (level, time, phase, lowImpact) => {
  const p = buildBoneProgram({ level, time, phase, lowImpact })
  const T = BONE_TIMES.find((t) => t.id === time)

  it('has the promised number of sessions and a valid shape', () => {
    expect(p.id).toBeUndefined()
    expect(p.days).toHaveLength(T.days)
    expect(p.boneDensity).toEqual({ level, time, phase, lowImpact })
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
      expect(min).toBeLessThanOrEqual(T.minutes + 10)
    }
  })

  it('keeps the LIFTMOR core on every heavy day: hinge, press with impact, squat', () => {
    for (const d of p.days.filter((x) => !x.title.includes('Balance'))) {
      const [hinge, press, impact, squat] = d.exercises
      expect(hinge.pattern).toBe('hinge')
      expect(press.pattern).toBe('vert_push')
      // alternate press and impact only when their set counts match
      expect(!!press.supersetNext).toBe(press.sets === impact.sets)
      expect(squat.pattern).toBe('squat')
      // ramp-up sets on every heavy lift once the weights are real
      for (const lift of [hinge, press, squat]) expect(!!lift.warmups).toBe(phase > 1)
      // the phase sets the main lifts' sets × reps
      for (const lift of [hinge, press, squat]) {
        expect([lift.sets, lift.repLow, lift.repHigh]).toEqual([BONE_PHASES[phase].sets, BONE_PHASES[phase].low, BONE_PHASES[phase].high])
      }
      // ~50 impacts a session, counting the extra stomps after chin-up landings
      const impacts = d.exercises.filter((e) => ['heel_drop', 'stomp', 'pogo_jump', 'jump_chinup_drop'].includes(e.id))
      if (!lowImpact) expect(impacts.reduce((n, e) => n + e.sets * e.repHigh, 0)).toBeGreaterThanOrEqual(50)
    }
  })

  it('has no jumps or landings in the low-impact version', () => {
    if (!lowImpact) return
    for (const d of p.days) for (const e of d.exercises) {
      expect(['pogo_jump', 'jump_chinup_drop', 'heel_drop', 'stomp', 'squat_jump', 'jump_rope'].includes(e.id), e.id).toBe(false)
    }
    expect(p.days.every((d) => d.exercises.some((e) => e.id === 'marching'))).toBe(true)
  })

  it('never does a second hinge or a bent-over row after heavy deadlifts', () => {
    for (const d of p.days) {
      const ids = d.exercises.map((e) => e.id)
      expect(ids).not.toContain('romanian_dl')
      expect(ids).not.toContain('barbell_row')
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
    for (const d of p.days) expect(d.note).toContain(BONE_DAY_SAFETY)
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
    // the chin-up landing is 5 × 5, so stomps top the day up to ~50 impacts
    expect(buildBoneProgram({ level: 'experienced', time: '2x30' }).days[0].exercises[4].id).toBe('stomp')
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
  const NEW = ['marching', 'trap_bar_deadlift', 'split_squat', 'heel_drop', 'stomp', 'pogo_jump', 'jump_chinup_drop', 'single_leg_stance', 'tandem_walk', 'single_leg_reach', 'pallof_press', 'prone_back_extension_hold']
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

describe('equipment swaps use the program’s own alternatives first', () => {
  it('a standing barbell press becomes a standing dumbbell press, not a seated one', async () => {
    const { bestSubstitute } = await import('../lib/equipment.js')
    const p = buildBoneProgram({ level: 'some', time: '2x30', phase: 2 })
    const press = p.days[0].exercises[1]
    expect(bestSubstitute(press, ['dumbbells', 'adj_bench'])?.id).toBe('db_shoulder_press')
  })
})
