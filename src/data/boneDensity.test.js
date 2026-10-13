// The Bone Strength generator turns a few answers into a program. Every
// combination must produce something real, safe, and sized as promised — and
// the rest of the app must treat it the way the program says.
import { describe, it, expect } from 'vitest'
import {
  buildBoneProgram, rebuildBoneProgram, startPhaseFor, BONE_LEVELS, BONE_TIMES, BONE_PHASES, BONE_DAY_SAFETY,
} from './boneDensity.js'
import { EXERCISE_BY_ID, EXERCISES, exMeasure, musclesFor } from './exercises.js'
import { estimateSessionMinutes } from '../lib/duration.js'
import { resolveExercisesForEquipment, bestSubstitute } from '../lib/equipment.js'
import { reviewSession } from '../lib/sessionReview.js'
import { recommendChoice } from '../lib/progressionMethods.js'
import { generateProgram } from '../lib/generator.js'

const COMBOS = []
for (const l of BONE_LEVELS) for (const t of BONE_TIMES) for (const p of [1, 2, 3]) for (const li of [false, true]) for (const fr of [false, true]) COMBOS.push([l.id, t.id, p, li, fr])

// Loaded spinal flexion is the one thing the osteoporosis guidance is unanimous
// about avoiding. None of these may ever appear.
const FLEXION = ['crunch', 'situp', 'sit_up', 'v_up', 'toe_touch', 'russian_twist', 'ab_crunch', 'jackknife', 'leg_raise', 'roll_up', 'good_morning', 'jefferson']
const JUMPS = ['pogo_jump', 'jump_chinup_drop', 'squat_jump', 'jump_rope']
const IMPACT = ['heel_drop', 'stomp', 'pogo_jump', 'jump_chinup_drop']

describe.each(COMBOS)('%s · %s · phase %s · low-impact %s · falls %s', (level, time, phase, lowImpact, fallRisk) => {
  const p = buildBoneProgram({ level, time, phase, lowImpact, fallRisk })
  const T = BONE_TIMES.find((t) => t.id === time)
  const main = (d) => d.exercises.filter((e) => e.boneSlot === 'main')

  it('has the promised number of sessions and a valid shape', () => {
    expect(p.id).toBeUndefined()
    expect(p.days).toHaveLength(T.days)
    expect(p.boneDensity).toEqual({ level, time, phase, lowImpact, fallRisk })
    expect(p.schedule.trainingDays).toHaveLength(T.days)
  })

  it('only uses real exercises, once each per day, with no level-up ladders', () => {
    for (const d of p.days) {
      const ids = d.exercises.map((e) => e.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const e of d.exercises) {
        expect(EXERCISE_BY_ID[e.id], e.id).toBeTruthy()
        for (const a of e.alts || []) expect(EXERCISE_BY_ID[a], a).toBeTruthy()
        expect(e.nextId, e.id).toBeNull()
      }
    }
  })

  it('keeps sessions to a believable length', () => {
    for (const d of p.days) {
      const min = estimateSessionMinutes(d)
      expect(min).toBeGreaterThanOrEqual(15)
      expect(min).toBeLessThanOrEqual(80)
    }
  })

  it('keeps the LIFTMOR core on every main day, prescribed by the phase', () => {
    for (const d of p.days.filter((x) => !x.title.includes('Balance'))) {
      const [hinge, press, impact, squat] = d.exercises
      expect([hinge.pattern, press.pattern, squat.pattern]).toEqual(['hinge', 'vert_push', 'squat'])
      expect(main(d)).toEqual([hinge, press, squat])
      expect(impact.boneSlot).toBe('impact')
      // alternate press and impact only when their set counts match
      expect(!!press.supersetNext).toBe(press.sets === impact.sets)
      for (const lift of [hinge, press, squat]) {
        expect([lift.sets, lift.repLow, lift.repHigh]).toEqual([BONE_PHASES[phase].sets, BONE_PHASES[phase].low, BONE_PHASES[phase].high])
        expect(!!lift.warmups).toBe(phase > 1)
      }
      // heavy 5 × 5 gets 2–3 minutes' rest (ACSM)
      if (phase === 3) expect(hinge.restSec).toBeGreaterThanOrEqual(120)
    }
  })

  it('doses impact to match the answers', () => {
    for (const d of p.days) {
      const ids = d.exercises.map((e) => e.id)
      if (lowImpact) {
        for (const id of [...JUMPS, 'heel_drop', 'stomp']) expect(ids, id).not.toContain(id)
        expect(ids).toContain('marching')
      } else {
        const n = d.exercises.filter((e) => IMPACT.includes(e.id)).reduce((s, e) => s + e.sets * e.repHigh, 0)
        expect(n).toBeGreaterThanOrEqual(50)
      }
      if (fallRisk) for (const id of JUMPS) expect(ids, id).not.toContain(id)
    }
  })

  it('trains balance and the back extensors every session — more of it with a falls history', () => {
    for (const d of p.days) {
      const ids = d.exercises.map((e) => e.id)
      expect(ids).toContain('prone_back_extension_hold')
      expect(ids.some((id) => ['single_leg_stance', 'single_leg_reach', 'tandem_walk'].includes(id))).toBe(true)
      const stance = d.exercises.find((e) => e.id === 'single_leg_stance')
      if (stance) expect(stance.sets).toBe(fallRisk ? 6 : 4)
    }
  })

  it('never includes loaded spinal flexion, a second hinge or a bent-over barbell row', () => {
    for (const d of p.days) for (const e of d.exercises) {
      for (const bad of FLEXION) expect(e.id.includes(bad), e.id).toBe(false)
      expect(['romanian_dl', 'barbell_row']).not.toContain(e.id)
    }
  })

  it('uses the lighter lifts after a spine fracture', () => {
    if (!lowImpact) return
    const ids = p.days[0].exercises.map((e) => e.id)
    expect(ids).toContain('goblet_squat')
    expect(ids).not.toContain('back_squat')
    expect(ids).not.toContain('deadlift')
  })

  it('carries the short safety line on every day', () => {
    for (const d of p.days) expect(d.note).toContain(BONE_DAY_SAFETY)
  })
})

describe('experience changes the program', () => {
  const lifts = (level) => buildBoneProgram({ level, time: '2x30' }).days[0].exercises.slice(0, 4).map((e) => e.id)
  it('new lifters start in the technique phase on beginner lifts and gentle impact', () => {
    expect(buildBoneProgram({ level: 'new', time: '2x30' }).boneDensity.phase).toBe(1)
    expect(lifts('new')).toEqual(['trap_bar_deadlift', 'db_shoulder_press', 'heel_drop', 'goblet_squat'])
  })
  it('experienced lifters get the full LIFTMOR protocol at 5 × 5, topped up to ~50 impacts', () => {
    const p = buildBoneProgram({ level: 'experienced', time: '2x30' })
    expect(p.boneDensity.phase).toBe(3)
    expect(lifts('experienced')).toEqual(['deadlift', 'overhead_press', 'jump_chinup_drop', 'back_squat'])
    expect(p.days[0].exercises[4].id).toBe('stomp')
  })
  it('a fracture history always starts at the technique phase', () => {
    expect(startPhaseFor('experienced', { lowImpact: true })).toBe(1)
    expect(buildBoneProgram({ level: 'experienced', time: '2x30', lowImpact: true }).boneDensity.phase).toBe(1)
  })
})

describe('equipment fallbacks', () => {
  it('a home with only dumbbells still gets a full session', () => {
    const p = buildBoneProgram({ level: 'some', time: '2x45', phase: 2 })
    const ids = resolveExercisesForEquipment(p.days[0].exercises, ['dumbbells', 'adj_bench']).map((e) => e.id)
    expect(ids).toEqual(expect.arrayContaining(['db_rdl', 'db_shoulder_press', 'goblet_squat']))
  })
  it('a standing barbell press becomes a standing dumbbell press, not a seated one', () => {
    const press = buildBoneProgram({ level: 'some', time: '2x30', phase: 2 }).days[0].exercises[1]
    expect(bestSubstitute(press, ['dumbbells', 'adj_bench'])?.id).toBe('db_shoulder_press')
  })
})

describe('changing phase', () => {
  const base = () => {
    const p = { ...buildBoneProgram({ level: 'new', time: '2x45' }), id: 'p1', schedule: { mode: 'rotation', trainingDays: [2, 5] } }
    // things a user might have done in the builder or by training
    p.days[0].title = 'My Monday'
    p.days[0].exercises[0].startWeight = '60'
    p.days[0].exercises.push({ id: 'face_pull', name: 'Face Pull', sets: 2, repLow: 15, repHigh: 15, restSec: 45 })
    p.days[1].exercises[5].sets = 4 // an accessory the user changed
    return p
  }
  it('rewrites only the main lifts and keeps every edit', () => {
    const next = rebuildBoneProgram(base(), 3)
    expect(next.id).toBe('p1')
    expect(next.boneDensity.phase).toBe(3)
    expect(next.schedule.trainingDays).toEqual([2, 5])
    expect(next.days[0].title).toBe('My Monday')
    expect(next.days[0].exercises.at(-1).id).toBe('face_pull')
    expect(next.days[1].exercises[5].sets).toBe(4)
    const hinge = next.days[0].exercises[0]
    expect([hinge.startWeight, hinge.sets, hinge.repHigh, hinge.warmups]).toEqual(['60', 5, 5, true])
    expect(next.days[0].exercises[1].supersetNext).toBe(true)
    expect(next.days[0].note.startsWith('Strength phase.')).toBe(true)
  })
  it('round-trips back to the earlier phase', () => {
    const back = rebuildBoneProgram(rebuildBoneProgram(base(), 3), 1)
    expect(back.days[0].exercises[0].repHigh).toBe(10)
    expect(back.days[0].exercises[1].supersetNext).toBeUndefined()
  })
  it('copes with a phase stored as text, and leaves non-bone programs alone', () => {
    expect(rebuildBoneProgram(base(), '2').boneDensity.phase).toBe(2)
    const plain = { name: 'x', days: [] }
    expect(rebuildBoneProgram(plain, 2)).toBe(plain)
  })
})

describe('progress suggestions after a bone session', () => {
  const dayFor = (phase) => buildBoneProgram({ level: 'some', time: '2x30', phase }).days[0]
  const allDone = (day, weight) => Object.fromEntries(day.exercises.map((e) => [e.id, Array.from({ length: e.sets }, () => ({ weight: String(weight), reps: String(e.repHigh), done: true }))]))

  it('offers only the smallest weight jump, and no "+1 rep" on a fixed 5 × 5', () => {
    const day = dayFor(3)
    const { suggestions } = reviewSession(day, allDone(day, 60), ['strength'], 'lbs', 'double', { bone: { phase: 3 } })
    const hinge = suggestions.find((s) => s.exId === 'trap_bar_deadlift')
    expect(hinge.incs).toEqual([5])
    expect(hinge.reps).toBeNull()
    expect(suggestions.find((s) => s.exId === 'overhead_press').incs).toEqual([2.5])
    // impact, balance and posture are fixed doses — nothing to suggest
    expect(suggestions.some((s) => ['pogo_jump', 'single_leg_stance', 'prone_back_extension_hold'].includes(s.exId))).toBe(false)
  })
  it('recommends keeping the weight during the technique phase', () => {
    const day = dayFor(1)
    const { suggestions } = reviewSession(day, allDone(day, 30), ['strength'], 'lbs', 'double', { bone: { phase: 1 } })
    const sug = suggestions.find((s) => s.exId === 'trap_bar_deadlift')
    expect(sug.holdForTechnique).toBe(true)
    expect(recommendChoice('double', sug)).toBe('keep')
  })
})

describe('the program’s own drills stay in the program', () => {
  it('never appear in generated programs', () => {
    const programOnly = new Set(EXERCISES.filter((e) => e.programOnly).map((e) => e.id))
    expect(programOnly.size).toBeGreaterThan(5)
    for (const daysPerWeek of [2, 3, 4, 5]) for (const goals of [['strength'], ['muscle'], ['general']]) {
      const p = generateProgram({ goals, focusAreas: ['legs', 'back'], trainOthers: true, equipment: ['barbell', 'rack', 'flat_bench', 'dumbbells', 'pullup_bar', 'cable'], daysPerWeek, sessionLength: 60, experienceLevel: 'intermediate' })
      for (const d of p.days) for (const e of d.exercises) expect(programOnly.has(e.id), e.id).toBe(false)
    }
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
