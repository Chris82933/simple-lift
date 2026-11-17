import { describe, it, expect } from 'vitest'
import { SWAP_TABLE } from '../data/swapFamilies.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { ALL_EQUIPMENT_IDS } from './equipment.js'
import { translateSet, swapOptions, stationOf, feelerWeight, adjustAfterFeeler, scaleLoad, usableHere } from './swapTranslate.js'

const GYM = new Set(ALL_EQUIPMENT_IDS)

describe('swap table', () => {
  it('only lists real exercises, with sane ratios', () => {
    for (const [id, v] of Object.entries(SWAP_TABLE)) {
      expect(EXERCISE_BY_ID[id], id).toBeTruthy()
      expect(v.r).toBeGreaterThan(0)
      expect(['H', 'M', 'L']).toContain(v.conf)
    }
  })
  it('has a reference lift (r = 1) in every family', () => {
    const fams = new Set(Object.values(SWAP_TABLE).map((v) => v.family))
    for (const f of fams) expect(Object.values(SWAP_TABLE).some((v) => v.family === f && v.r === 1), f).toBe(true)
  })
})

describe('translateSet', () => {
  it('back squat 225 × 5 → hack squat a bit heavier, leg press much heavier', () => {
    const hack = translateSet({ fromId: 'back_squat', toId: 'hack_squat', weight: 225, reps: 5 })
    expect(hack.weight).toBeGreaterThan(225)
    expect(hack.weight).toBeLessThan(290)
    expect(hack.weight % 10).toBe(0) // machine stack steps
    expect(hack.conf).toBe('L')
    const press = translateSet({ fromId: 'back_squat', toId: 'leg_press', weight: 225, reps: 5 })
    expect(press.weight).toBeGreaterThan(350)
  })

  it('translates dumbbells per dumbbell and works in fives instead of triples', () => {
    const t = translateSet({ fromId: 'bench_press', toId: 'db_bench', weight: 225, reps: 3 })
    expect(t.perHand).toBe(true)
    expect(t.reps).toBe(5)
    expect(t.weight).toBeGreaterThan(60)
    expect(t.weight).toBeLessThan(95)
  })

  it('caps at the heaviest dumbbell and adds reps instead', () => {
    const t = translateSet({ fromId: 'back_squat', toId: 'goblet_squat', weight: 315, reps: 5, capacity: { dumbbells: 50 } })
    expect(t.weight).toBe(50)
    expect(t.capped).toBe(true)
    expect(t.reps).toBeGreaterThan(5)
  })

  it('goes by feel across families, onto bodyweight, or with no planned weight', () => {
    expect(translateSet({ fromId: 'back_squat', toId: 'bench_press', weight: 225, reps: 5 }).weight).toBeNull()
    expect(translateSet({ fromId: 'back_squat', toId: 'bw_squat', weight: 225, reps: 5 }).conf).toBe('feel')
    expect(translateSet({ fromId: 'back_squat', toId: 'front_squat', weight: '', reps: 5 }).weight).toBeNull()
  })

  it('rounds to kg steps and never goes under the empty bar', () => {
    const t = translateSet({ fromId: 'leg_press', toId: 'back_squat', weight: 20, reps: 10, units: 'kg' })
    expect(t.weight).toBeGreaterThanOrEqual(20)
    expect((t.weight * 10) % 25).toBe(0)
  })

  it('uses a learned ratio when there is one, and trusts it more', () => {
    const plain = translateSet({ fromId: 'back_squat', toId: 'leg_press', weight: 225, reps: 5 })
    const learned = translateSet({ fromId: 'back_squat', toId: 'leg_press', weight: 225, reps: 5, learned: 1.2 })
    expect(learned.weight).toBeGreaterThan(plain.weight)
    expect(learned.conf).toBe('H')
  })
})

describe('feeler set', () => {
  it('starts a bit lighter', () => {
    expect(feelerWeight(250, 'hack_squat')).toBe(220)
    expect(feelerWeight(50, 'bench_press')).toBe(45)
  })
  it('only moves the rest when the feeler clearly missed or flew — and in that direction', () => {
    const base = { toId: 'hack_squat', feelerW: 220, targetReps: 5, current: 250 }
    // Logging the planned reps (or a few more) on a lighter set says nothing.
    for (const r of [5, 6, 7, 8, 9]) expect(adjustAfterFeeler({ ...base, feelerReps: r }), `${r} reps`).toBeNull()
    // A miss at the lighter weight drops below the feeler itself.
    expect(adjustAfterFeeler({ ...base, feelerReps: 3 })).toBeLessThan(220)
    // Far more than the working weight's max allows: go up, never down.
    for (const r of [11, 12, 15]) expect(adjustAfterFeeler({ ...base, feelerReps: r }), `${r} reps`).toBeGreaterThan(250)
  })
})

describe('swapOptions', () => {
  it('never offers anything on the taken station, and puts realistic stand-ins first', () => {
    const opts = swapOptions(EXERCISE_BY_ID.back_squat, { available: GYM, planned: { weight: 225, reps: 5 } })
    expect(opts.length).toBeGreaterThan(3)
    for (const o of opts) expect(o.lib.requires, o.lib.id).not.toContain('rack')
    expect(opts.slice(0, 3).map((o) => o.lib.id)).toEqual(['hack_squat', 'smith_squat', 'leg_press'])
    const dead = swapOptions(EXERCISE_BY_ID.deadlift, { available: GYM, planned: { weight: 315, reps: 5 } }).map((o) => o.lib.id)
    expect(dead[0]).toBe('trap_bar_deadlift')
    for (const id of dead) expect(EXERCISE_BY_ID[id].requires, id).not.toContain('barbell')
  })

  it('never offers a timed hold or the original lift itself', () => {
    const opts = swapOptions(EXERCISE_BY_ID.lat_pulldown, { available: GYM, planned: { weight: 120, reps: 10 } })
    for (const o of opts) expect(o.lib.hold, o.lib.id).toBeFalsy()
    const fromStandIn = swapOptions({ ...EXERCISE_BY_ID.leg_press }, { available: GYM, fromId: 'back_squat', planned: { weight: 225, reps: 5 } })
    expect(fromStandIn.map((o) => o.lib.id)).not.toContain('back_squat')
  })

  it('keeps a lift that needs another taken station out', () => {
    const opts = swapOptions(EXERCISE_BY_ID.back_squat, { available: GYM, planned: { weight: 225, reps: 5 } })
    expect(opts.map((o) => o.lib.id)).toContain('leg_press')
    for (const o of opts) expect(['squat', 'lunge']).toContain(o.lib.pattern)
  })

  it('skips anything on a station marked busy, and lifts already in the session', () => {
    const opts = swapOptions(EXERCISE_BY_ID.back_squat, { available: GYM, busy: ['rack', 'leg_press'], inSession: ['hack_squat'], planned: { weight: 225, reps: 5 } })
    const ids = opts.map((o) => o.lib.id)
    expect(ids).not.toContain('front_squat')
    expect(ids).not.toContain('leg_press')
    expect(ids).not.toContain('hack_squat')
  })

  it('respects the equipment profile', () => {
    const home = new Set(['dumbbells', 'flat_bench'])
    const ids = swapOptions(EXERCISE_BY_ID.bench_press, { available: home, planned: { weight: 185, reps: 5 } }).map((o) => o.lib.id)
    expect(ids).toContain('db_bench')
    expect(ids).not.toContain('chest_press_machine')
  })
})

describe('stations', () => {
  it('names the kit that gets taken', () => {
    expect(stationOf(EXERCISE_BY_ID.back_squat).label).toBe('Rack')
    expect(stationOf(EXERCISE_BY_ID.bench_press).key).toBe('barbell_bench')
    expect(stationOf(EXERCISE_BY_ID.pushup)).toBeNull()
    expect(usableHere(EXERCISE_BY_ID.db_bench, GYM, ['barbell_bench'])).toBe(true)
    expect(usableHere(EXERCISE_BY_ID.bench_press, GYM, ['barbell_bench'])).toBe(false)
  })
  it('scales a stored load between lifts of one family', () => {
    expect(scaleLoad('bench_press', 'db_bench', 200)).toBe(75)
    expect(scaleLoad('bench_press', 'back_squat', 200)).toBeNull()
  })
})

describe('swapping for the gear before a session', () => {
  it('scales the original weight instead of copying a barbell number onto dumbbells', async () => {
    const { resolveForEquipment } = await import('./equipment.js')
    const squat = { ...EXERCISE_BY_ID.back_squat, startWeight: 225, progression: { scheme: 'lp', weight: 225, fails: 0 }, alts: ['goblet_squat'] }
    const r = resolveForEquipment(squat, new Set(['dumbbells']), { units: 'lbs' })
    expect(r.id).toBe('goblet_squat')
    expect(r.startWeight).toBe(70)
    expect(r.progression.weight).toBe(70)
  })
  it('blanks it when the two lifts cannot be compared', async () => {
    const { resolveForEquipment } = await import('./equipment.js')
    const squat = { ...EXERCISE_BY_ID.back_squat, startWeight: 225, alts: ['bw_squat'] }
    const r = resolveForEquipment(squat, new Set([]), { units: 'lbs' })
    expect(r.id).toBe('bw_squat')
    expect(r.startWeight).toBe('')
  })
})
