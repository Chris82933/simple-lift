import { describe, it, expect } from 'vitest'
import {
  weekStart, sessionsThisWeek, trainingStreakWeeks, weeklyCounts, volumeThisWeek, prTimeline,
} from './consistency.js'

// A fixed reference "now": Wednesday 2024-06-12 (its week starts Mon 2024-06-10).
const NOW = new Date('2024-06-12T09:00:00').getTime()
const DAY = 86400000
const WEEK = 7 * DAY
const session = (date, extra = {}) => ({ date: new Date(date).toISOString(), ...extra })

describe('weekStart', () => {
  it('snaps any day to its Monday midnight', () => {
    const mon = weekStart('2024-06-10T00:00:00')
    expect(weekStart('2024-06-12T09:00:00')).toBe(mon) // Wed
    expect(weekStart('2024-06-16T23:59:00')).toBe(mon) // Sun
    expect(weekStart('2024-06-09T12:00:00')).toBe(mon - WEEK) // previous Sun
  })
})

describe('sessionsThisWeek', () => {
  it('counts only workouts in the current week', () => {
    // Local datetimes (date-only strings parse as UTC midnight and can shift a day).
    const hist = [session('2024-06-12T09:00:00'), session('2024-06-10T09:00:00'), session('2024-06-08T09:00:00')]
    expect(sessionsThisWeek(hist, NOW)).toBe(2)
  })
})

describe('trainingStreakWeeks', () => {
  it('counts consecutive weeks with a workout', () => {
    const hist = [session(NOW), session(NOW - WEEK), session(NOW - 2 * WEEK)]
    expect(trainingStreakWeeks(hist, NOW)).toBe(3)
  })

  it('preserves the streak while the current week is still empty', () => {
    const hist = [session(NOW - WEEK), session(NOW - 2 * WEEK)]
    expect(trainingStreakWeeks(hist, NOW)).toBe(2) // this week empty, grace applies
  })

  it('breaks when a whole week was missed', () => {
    const hist = [session(NOW), session(NOW - 2 * WEEK)] // last week skipped
    expect(trainingStreakWeeks(hist, NOW)).toBe(1)
  })

  it('is 0 with no history', () => {
    expect(trainingStreakWeeks([], NOW)).toBe(0)
  })
})

describe('weeklyCounts', () => {
  it('returns n zero-filled weeks oldest → newest ending this week', () => {
    const hist = [session(NOW), session(NOW), session(NOW - 2 * WEEK)]
    const out = weeklyCounts(hist, NOW, 4)
    expect(out).toHaveLength(4)
    expect(out.map((w) => w.count)).toEqual([0, 1, 0, 2]) // 3 wks ago, 2 ago, last, this
    expect(out[3].weekStart).toBe(weekStart(NOW))
  })
})

describe('volumeThisWeek', () => {
  it('sums completed working-set volume in the current week only', () => {
    const hist = [
      session(NOW, { entries: [{ sets: [
        { weight: 100, reps: 5, done: true },
        { weight: 100, reps: 5, done: true },
        { weight: 50, reps: 5, done: true, warmup: true }, // warm-up excluded
        { weight: 100, reps: 5, done: false }, // not done excluded
      ] }] }),
      session(NOW - WEEK, { entries: [{ sets: [{ weight: 999, reps: 5, done: true }] }] }), // other week
    ]
    expect(volumeThisWeek(hist, NOW)).toBe(1000)
  })
})

describe('prTimeline', () => {
  it('flattens PRs across sessions with their dates, newest first', () => {
    const hist = [
      session(NOW, { prs: [{ name: 'Squat', kind: 'e1rm', value: 315 }] }),
      session(NOW - WEEK, { prs: [{ name: 'Bench', kind: 'weight', value: 185 }, { name: 'Row', kind: 'reps', value: 12 }] }),
      session(NOW - 2 * WEEK, {}), // no prs
    ]
    const tl = prTimeline(hist)
    expect(tl).toHaveLength(3)
    expect(tl[0]).toMatchObject({ name: 'Squat', kind: 'e1rm', value: 315 })
    expect(tl[0].date).toBe(hist[0].date)
    expect(tl[2].name).toBe('Row')
  })
})
