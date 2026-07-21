// GZCLP progression rules, checked against the published program / the Reddit
// and LiftVault spreadsheets. These are the numbers people trust the app to get
// right, so each rule gets an explicit test rather than a spot check.
import { describe, it, expect, afterEach } from 'vitest'
import { evaluateProgression, applyStage, stageNote, GZCLP_SCHEMES } from './gzclp.js'
import { buildGzclpProgram, previewRotation, startWeights, oneRMFrom } from './gzclpBuild.js'

const squat = (over = {}) => ({
  name: 'Squat', pattern: 'squat', regions: ['legs', 'core'],
  progression: { scheme: 't1', stage: 0, weight: 225 }, ...over,
})
const bench = (over = {}) => ({
  name: 'Bench', pattern: 'horiz_push', regions: ['chest'],
  progression: { scheme: 't2', stage: 0, weight: 150, stage1Weight: 150 }, ...over,
})
// n completed sets of `reps` at `weight`.
const sets = (weight, reps, n) => Array.from({ length: n }, () => ({ weight, reps, done: true }))

describe('T1 — 5×3 → 6×2 → 10×1', () => {
  it('adds 10 lb to a lower-body lift on a clean session', () => {
    const r = evaluateProgression(squat(), sets(225, 3, 5), 'lbs')
    expect(r.kind).toBe('increase')
    expect(r.progression.weight).toBe(235)
  })

  it('adds only 5 lb to a press', () => {
    const ohp = squat({ name: 'OHP', pattern: 'vert_push', regions: ['shoulders'], progression: { scheme: 't1', stage: 0, weight: 100 } })
    expect(evaluateProgression(ohp, sets(100, 3, 5), 'lbs').progression.weight).toBe(105)
  })

  it('uses kg increments when the user is in kg', () => {
    const sq = squat({ progression: { scheme: 't1', stage: 0, weight: 100 } })
    expect(evaluateProgression(sq, sets(100, 3, 5), 'kg').progression.weight).toBe(105)
    const ohp = squat({ name: 'OHP', pattern: 'vert_push', regions: ['shoulders'], progression: { scheme: 't1', stage: 0, weight: 60 } })
    expect(evaluateProgression(ohp, sets(60, 3, 5), 'kg').progression.weight).toBe(62.5)
  })

  it('drops a stage at the same weight on a miss, rather than deloading', () => {
    const r = evaluateProgression(squat(), sets(225, 2, 5), 'lbs') // 2 reps, needed 3
    expect(r.progression.stage).toBe(1)
    expect(r.progression.weight).toBe(225)
  })

  it('cuts 10% and restarts stage 1 after failing the last stage', () => {
    const sq = squat({ progression: { scheme: 't1', stage: 2, weight: 225 } })
    const r = evaluateProgression(sq, sets(225, 1, 7), 'lbs') // only 7 of 10 singles
    expect(r.progression.stage).toBe(0)
    expect(r.progression.weight).toBe(205) // 225 × 0.9, rounded to 5
  })
})

describe('increments respect the plates you actually own', () => {
  // back_squat requires a barbell, so the plate inventory applies to it.
  const barSquat = () => ({
    name: 'Squat', id: 'back_squat', pattern: 'squat', regions: ['legs', 'core'],
    progression: { scheme: 't1', stage: 0, weight: 225 },
  })
  const ownOnly = (weights) => {
    const available = { lbs: {}, kg: {} }
    for (const w of [45, 35, 25, 10, 5, 2.5]) available.lbs[w] = weights.includes(w)
    for (const w of [25, 20, 15, 10, 5, 2.5, 1.25]) available.kg[w] = true
    window.localStorage.setItem('simple-lift:settings', JSON.stringify({ plates: { available } }))
  }

  afterEach(() => window.localStorage.clear())

  it('uses the standard jump when every plate is available', () => {
    expect(evaluateProgression(barSquat(), sets(225, 3, 5), 'lbs').inc).toBe(10)
  })

  it('rounds a press jump up when the smallest plate is a 5', () => {
    ownOnly([45, 35, 25, 10, 5]) // no 2.5s → smallest possible jump is 10 lb
    const ohp = {
      name: 'OHP', id: 'overhead_press', pattern: 'vert_push', regions: ['shoulders'],
      progression: { scheme: 't1', stage: 0, weight: 100 },
    }
    // A 5 lb jump would need 2.5s, which this user doesn't have.
    expect(evaluateProgression(ohp, sets(100, 3, 5), 'lbs').inc).toBe(10)
  })

  it('leaves dumbbell work alone — plates do not apply', () => {
    ownOnly([45])
    const row = {
      name: 'DB Row', id: 'db_row', pattern: 'horiz_pull', regions: ['back'],
      progression: { scheme: 't3', stage: 0, weight: 50 },
    }
    const r = evaluateProgression(row, [...sets(50, 15, 2), { weight: 50, reps: 26, done: true }], 'lbs')
    expect(r.inc).toBe(5)
  })
})

describe('T2 — 3×10 → 3×8 → 3×6', () => {
  it('walks down the stages on consecutive misses, holding the weight', () => {
    let ex = bench()
    const miss = () => {
      const r = evaluateProgression(ex, sets(150, 2, 3), 'lbs')
      ex = { ...ex, progression: r.progression }
      return r
    }
    expect(miss().progression.stage).toBe(1)
    expect(miss().progression.stage).toBe(2)
    expect(ex.progression.weight).toBe(150) // weight untouched through the drops
  })

  it('restarts at the last stage-1 weight + 15 lb after failing stage 3', () => {
    const ex = bench({ progression: { scheme: 't2', stage: 2, weight: 150, stage1Weight: 150 } })
    const r = evaluateProgression(ex, sets(150, 2, 3), 'lbs')
    expect(r.progression.stage).toBe(0)
    expect(r.progression.weight).toBe(165)
    expect(r.progression.stage1Weight).toBe(165)
  })

  it('restarts with +7.5 kg in kg', () => {
    const ex = bench({ progression: { scheme: 't2', stage: 2, weight: 70, stage1Weight: 70 } })
    expect(evaluateProgression(ex, sets(70, 2, 3), 'kg').progression.weight).toBe(77.5)
  })

  it('remembers the stage-1 weight as it climbs, so a reset builds from there', () => {
    const r = evaluateProgression(bench(), sets(150, 10, 3), 'lbs')
    expect(r.progression.weight).toBe(155)
    expect(r.progression.stage1Weight).toBe(150) // the weight actually used at stage 1
  })

  it('has no AMRAP set', () => {
    expect(GZCLP_SCHEMES.t2.amrap).toBe(false)
  })
})

describe('T3 — 3×15+, add weight at 25 reps', () => {
  const lat = { name: 'Lat Pulldown', pattern: 'vert_pull', regions: ['back'], progression: { scheme: 't3', stage: 0, weight: 80 } }

  it('adds weight when the AMRAP set reaches 25', () => {
    const r = evaluateProgression(lat, [...sets(80, 15, 2), { weight: 80, reps: 26, done: true }], 'lbs')
    expect(r.kind).toBe('increase')
    expect(r.progression.weight).toBe(85)
  })

  it('holds when the AMRAP set falls short', () => {
    const r = evaluateProgression(lat, [...sets(80, 15, 2), { weight: 80, reps: 18, done: true }], 'lbs')
    expect(r.kind).toBe('hold')
    expect(r.progression.weight).toBe(80)
  })

  it('never changes stage — T3 has only one', () => {
    expect(GZCLP_SCHEMES.t3.stages).toHaveLength(1)
  })
})

describe('guards', () => {
  it('ignores exercises with no GZCLP progression', () => {
    expect(evaluateProgression({ name: 'Curl' }, sets(30, 12, 3), 'lbs')).toBeNull()
  })

  it('just records the weight when none has been logged yet', () => {
    const sq = squat({ progression: { scheme: 't1', stage: 0, weight: null } })
    const r = evaluateProgression(sq, [{ weight: 0, reps: 0, done: false }], 'lbs')
    expect(r.kind).toBe('hold')
  })

  it('applyStage renders the current stage as sets/reps', () => {
    const staged = applyStage(squat({ progression: { scheme: 't1', stage: 1, weight: 225 } }))
    expect([staged.sets, staged.repLow]).toEqual([6, 2])
  })

  it('stageNote names the tier and stage', () => {
    expect(stageNote(squat(), 'lbs')).toContain('T1 · Stage 1')
  })
})

describe('program generator', () => {
  const cfg = {
    units: 'lbs', seedMode: 'oneRM', dayFormat: 3, extra: 'none',
    maxes: { back_squat: 300, bench_press: 200, deadlift: 400, overhead_press: 135 },
    t3: { vert_pull: 'lat_pulldown', horiz_pull: 'db_row' },
  }

  it('starts T1 at ~75% and T2 at ~60% of the 1RM', () => {
    expect(startWeights(300, 'lbs')).toEqual({ t1: 225, t2: 180 })
  })

  it('estimates a 1RM from a set of five', () => {
    expect(oneRMFrom('fiveRM', 245, 'lbs')).toBeGreaterThan(270)
    expect(oneRMFrom('light', 245, 'lbs')).toBe(0) // start-light seeds nothing
  })

  it('builds four workouts where every lift is T1 once and T2 once', () => {
    const p = buildGzclpProgram(cfg)
    expect(p.days).toHaveLength(4)
    const t1s = p.days.map((d) => d.exercises.find((e) => e.progression.scheme === 't1').id)
    const t2s = p.days.map((d) => d.exercises.find((e) => e.progression.scheme === 't2').id)
    expect([...t1s].sort()).toEqual([...t2s].sort())
    expect(new Set(t1s).size).toBe(4)
  })

  it('seeds each lift with its computed starting weight', () => {
    const a1 = buildGzclpProgram(cfg).days[0]
    expect(a1.exercises[0].progression.weight).toBe(225) // squat T1
    expect(a1.exercises[1].progression.weight).toBe(120) // bench T2 (200 × 0.6)
  })

  it('leaves weights blank in start-light mode', () => {
    const rows = previewRotation({ units: 'lbs', seedMode: 'light', maxes: {} })
    expect(rows.every((r) => r.t1Weight === null)).toBe(true)
  })

  it('maps the day format to training days', () => {
    expect(buildGzclpProgram({ ...cfg, dayFormat: 3 }).schedule.trainingDays).toEqual([1, 3, 5])
    expect(buildGzclpProgram({ ...cfg, dayFormat: 4 }).schedule.trainingDays).toEqual([1, 2, 4, 5])
  })

  it('adds the optional extra movement to every workout', () => {
    const p = buildGzclpProgram({ ...cfg, extra: 'arms' })
    expect(p.days.every((d) => d.exercises.length === 4)).toBe(true)
  })
})
