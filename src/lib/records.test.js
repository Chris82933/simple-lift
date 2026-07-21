// PR detection and the shareable session recap. The tricky part here is that a
// "rep" means different things per exercise: reps for a squat, SECONDS for a
// plank or a carry. Treating a 45-second farmer's walk as a 45-rep set once
// produced a nonsense 1RM, so measure-awareness gets explicit coverage.
import { describe, it, expect } from 'vitest'
import { sessionRecords, prShort, buildSessionSummary } from './records.js'
import { estimate1RM, weightForReps, warmupSets, roundTo } from './oneRepMax.js'

const entry = (exerciseId, name, rows) => ({ exerciseId, name, sets: rows })
const set = (weight, reps, extra = {}) => ({ weight, reps, done: true, ...extra })
const session = (entries) => ({ date: '2026-01-01', entries })

describe('personal records', () => {
  it('flags an estimated-1RM PR against prior history', () => {
    const prior = [session([entry('back_squat', 'Squat', [set(225, 5)])])]
    const now = [entry('back_squat', 'Squat', [set(245, 5)])]
    const { prs } = sessionRecords(now, prior)
    expect(prs).toHaveLength(1)
    expect(prs[0].kind).toBe('e1rm')
  })

  it('does not call a first-ever session a PR', () => {
    const { prs } = sessionRecords([entry('back_squat', 'Squat', [set(225, 5)])], [])
    expect(prs).toEqual([])
  })

  it('ignores warm-up sets', () => {
    const prior = [session([entry('back_squat', 'Squat', [set(225, 5)])])]
    const now = [entry('back_squat', 'Squat', [set(315, 5, { warmup: true }), set(185, 5)])]
    expect(sessionRecords(now, prior).prs).toEqual([])
  })

  it('tracks bodyweight lifts on reps', () => {
    const prior = [session([entry('pullup', 'Pull-Up', [set(0, 8)])])]
    const now = [entry('pullup', 'Pull-Up', [set(0, 11)])]
    const { prs } = sessionRecords(now, prior)
    expect(prs[0].kind).toBe('reps')
    expect(prs[0].value).toBe(11)
  })

  it('never computes a 1RM for a timed hold', () => {
    // 45 "reps" of a plank is 45 seconds — an e1RM here would be fiction.
    const prior = [session([entry('plank', 'Plank', [set(0, 30)])])]
    const now = [entry('plank', 'Plank', [set(0, 45)])]
    const { prs, oneRMUpdates } = sessionRecords(now, prior)
    expect(oneRMUpdates).toEqual([])
    expect(prs[0].kind).toBe('time')
  })

  it('offers a 1RM update when an AMRAP beats the saved max', () => {
    const prior = [session([entry('bench_press', 'Bench', [set(135, 5)])])]
    const now = [entry('bench_press', 'Bench', [set(185, 8)])]
    const { oneRMUpdates } = sessionRecords(now, prior, { bench_press: { oneRM: 200 } })
    expect(oneRMUpdates).toHaveLength(1)
    expect(oneRMUpdates[0].oneRM).toBeGreaterThan(200)
  })

  it('stays quiet when the saved max is still the best', () => {
    const prior = [session([entry('bench_press', 'Bench', [set(135, 5)])])]
    const now = [entry('bench_press', 'Bench', [set(135, 5)])]
    expect(sessionRecords(now, prior, { bench_press: { oneRM: 315 } }).oneRMUpdates).toEqual([])
  })

  it('scores a weighted pull-up as bodyweight + added load', () => {
    const prior = [session([entry('weighted_pullup', 'Weighted Pull-Up', [set(25, 5)])])]
    const now = [entry('weighted_pullup', 'Weighted Pull-Up', [set(35, 5)])]
    const { oneRMUpdates } = sessionRecords(now, prior, {}, { bodyweight: 180 })
    // 215 lb for 5 — not 35 lb for 5.
    expect(oneRMUpdates[0].weight).toBe(215)
    expect(oneRMUpdates[0].oneRM).toBeGreaterThan(215)
  })

  it('falls back to the added weight alone when no bodyweight is recorded', () => {
    const prior = [session([entry('weighted_pullup', 'Weighted Pull-Up', [set(25, 5)])])]
    const now = [entry('weighted_pullup', 'Weighted Pull-Up', [set(35, 5)])]
    expect(sessionRecords(now, prior, {}, {}).oneRMUpdates[0].weight).toBe(35)
  })

  it('leaves unloaded bodyweight sets as rep PRs, not e1RM', () => {
    const prior = [session([entry('pullup', 'Pull-Up', [set(0, 8)])])]
    const now = [entry('pullup', 'Pull-Up', [set(0, 12)])]
    const { prs, oneRMUpdates } = sessionRecords(now, prior, {}, { bodyweight: 180 })
    expect(prs[0].kind).toBe('reps')
    expect(oneRMUpdates).toEqual([])
  })

  it('does not add bodyweight to a barbell lift', () => {
    const prior = [session([entry('back_squat', 'Squat', [set(225, 5)])])]
    const now = [entry('back_squat', 'Squat', [set(245, 5)])]
    expect(sessionRecords(now, prior, {}, { bodyweight: 180 }).oneRMUpdates[0].weight).toBe(245)
  })

  it('compares old and new sessions on the same bodyweight basis', () => {
    // Same added weight and reps as last time — no PR, even though bw is applied.
    const prior = [session([entry('weighted_pullup', 'Weighted Pull-Up', [set(25, 5)])])]
    const now = [entry('weighted_pullup', 'Weighted Pull-Up', [set(25, 5)])]
    expect(sessionRecords(now, prior, {}, { bodyweight: 180 }).prs).toEqual([])
  })

  it('labels each PR kind readably', () => {
    expect(prShort({ kind: 'e1rm', value: 315 }, 'lbs')).toBe('est. 1RM 315 lbs')
    expect(prShort({ kind: 'time', value: 45, unit: 'sec' }, 'lbs')).toBe('45 sec hold')
    expect(prShort({ kind: 'reps', value: 12 }, 'lbs')).toBe('12 reps')
  })
})

describe('share text', () => {
  const summary = (entries, opts = { units: 'lbs' }) => buildSessionSummary('Day 1', entries, opts)

  it('compresses identical sets into "N sets × R reps @ weight"', () => {
    const text = summary([entry('back_squat', 'Squat', [set(185, 5), set(185, 5), set(185, 5)])])
    expect(text).toContain('Squat — 3 sets × 5 reps @ 185 lb')
  })

  it('lists the reps when only they vary', () => {
    const text = summary([entry('bench_press', 'Bench', [set(135, 8), set(135, 8), set(135, 6)])])
    expect(text).toContain('Bench — 135 lb: 8, 8, 6 reps')
  })

  it('lists weight×reps pairs when the weight ramps', () => {
    const text = summary([entry('deadlift', 'Deadlift', [set(135, 5), set(225, 3)])])
    expect(text).toContain('Deadlift — 135 lb×5, 225 lb×3')
  })

  it('marks bodyweight work as bw', () => {
    expect(summary([entry('pullup', 'Pull-Up', [set(0, 8), set(0, 8)])])).toContain('2 sets × 8 reps (bw)')
  })

  it('reports timed holds in seconds, not reps', () => {
    expect(summary([entry('plank', 'Plank', [set(0, 45), set(0, 45)])])).toContain('2 sets × 45 sec')
  })

  it('uses kg when that is the unit', () => {
    const text = summary([entry('back_squat', 'Squat', [set(100, 5)])], { units: 'kg' })
    expect(text).toContain('@ 100 kg')
    expect(text).not.toContain('lb')
  })

  it('includes logged cardio', () => {
    const text = summary([entry('back_squat', 'Squat', [set(185, 5)])], {
      units: 'lbs',
      cardio: [{ machineName: 'Treadmill', durationMin: 20, distance: 2.1, distanceUnit: 'mi' }],
    })
    expect(text).toContain('Treadmill — 20 min · 2.1mi')
  })

  it('leaves timed work out of the volume total', () => {
    const text = summary([entry('plank', 'Plank', [set(0, 60)])])
    expect(text).not.toContain('volume')
  })

  it('skips sets that were never completed', () => {
    const text = summary([entry('back_squat', 'Squat', [set(185, 5), { weight: 185, reps: 0, done: false }])])
    expect(text).toContain('1 sets × 5 reps')
  })
})

describe('1RM maths', () => {
  it('estimates a single from a rep set', () => {
    expect(estimate1RM(225, 1)).toBe(225)
    expect(estimate1RM(225, 5)).toBeGreaterThan(245)
  })

  it('works backwards to a target rep weight', () => {
    expect(weightForReps(300, 5, 5)).toBeLessThan(300)
    expect(weightForReps(300, 1, 5)).toBe(300)
  })

  it('rounds to the loadable increment', () => {
    expect(roundTo(183, 5)).toBe(185)
    expect(roundTo(101, 2.5)).toBe(100)
  })

  it('ramps warm-ups up to but never past the working weight', () => {
    const ramp = warmupSets(225, 5)
    expect(ramp.length).toBeGreaterThan(0)
    expect(Math.max(...ramp.map((s) => s.weight))).toBeLessThan(225)
  })
})
