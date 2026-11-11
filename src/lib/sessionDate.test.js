// Logged-date editing and multiple in-progress sessions.
import { describe, it, expect, beforeEach } from 'vitest'
import { toLocalInput, fromLocalInput, clampToNow, uniqueDate, sameLocalDay, describeSessionDate } from './sessionDate.js'
import {
  appendWorkout, loadHistory, changeWorkoutDate,
  saveActiveSession, loadActiveSession, loadActiveSessions, clearActiveSession,
} from './storage.js'
import { recomputeRecordsFrom } from './records.js'

beforeEach(() => window.localStorage.clear())

describe('sessionDate helpers', () => {
  it('round-trips a local date-time input', () => {
    const iso = new Date(2026, 10, 9, 18, 30).toISOString()
    expect(toLocalInput(iso)).toBe('2026-11-09T18:30')
    expect(fromLocalInput('2026-11-09T18:30')).toBe(iso)
    expect(fromLocalInput('')).toBeNull()
    expect(fromLocalInput('nonsense')).toBeNull()
    expect(toLocalInput('nonsense')).toBe('')
  })

  it('never allows a future date', () => {
    const now = Date.UTC(2026, 10, 10, 12)
    expect(clampToNow('2030-01-01T00:00:00.000Z', now)).toBe(new Date(now).toISOString())
    expect(clampToNow('2026-11-01T00:00:00.000Z', now)).toBe('2026-11-01T00:00:00.000Z')
  })

  it('keeps a free date as is and nudges a taken one', () => {
    const d = '2026-11-09T18:30:00.000Z'
    const now = Date.UTC(2026, 10, 10)
    expect(uniqueDate(d, [], now)).toBe(d)
    const nudged = uniqueDate(d, [d], now)
    expect(nudged).not.toBe(d)
    expect(Math.abs(new Date(nudged) - new Date(d))).toBe(1)
  })

  it('describes today and yesterday in words', () => {
    const now = new Date(2026, 10, 10, 15, 0).getTime()
    expect(describeSessionDate(new Date(2026, 10, 10, 9, 0).toISOString(), now)).toMatch(/^Today, /)
    expect(describeSessionDate(new Date(2026, 10, 9, 9, 0).toISOString(), now)).toMatch(/^Yesterday, /)
    expect(describeSessionDate(new Date(2026, 10, 2, 9, 0).toISOString(), now)).not.toMatch(/^(Today|Yesterday)/)
    expect(sameLocalDay(new Date(2026, 10, 10, 1).getTime(), new Date(2026, 10, 10, 23).getTime())).toBe(true)
  })
})

describe('logged session dates', () => {
  it('slots a back-dated session into date order and returns its date', () => {
    appendWorkout({ date: '2026-11-08T10:00:00.000Z', sessionTitle: 'A' })
    appendWorkout({ date: '2026-11-10T10:00:00.000Z', sessionTitle: 'C' })
    const d = appendWorkout({ date: '2026-11-09T10:00:00.000Z', sessionTitle: 'B' })
    expect(d).toBe('2026-11-09T10:00:00.000Z')
    expect(loadHistory().map((w) => w.sessionTitle)).toEqual(['C', 'B', 'A'])
  })

  it('never gives two sessions the same date (it is their id)', () => {
    const d1 = appendWorkout({ date: '2026-11-09T10:00:00.000Z', sessionTitle: 'A' })
    const d2 = appendWorkout({ date: '2026-11-09T10:00:00.000Z', sessionTitle: 'B' })
    expect(d1).not.toBe(d2)
    expect(new Set(loadHistory().map((w) => w.date)).size).toBe(2)
  })

  it('moves a logged session and keeps the list newest-first', () => {
    appendWorkout({ date: '2026-11-01T10:00:00.000Z', sessionTitle: 'A', notes: 'keep me' })
    appendWorkout({ date: '2026-11-05T10:00:00.000Z', sessionTitle: 'B' })
    const moved = changeWorkoutDate('2026-11-01T10:00:00.000Z', '2026-11-07T10:00:00.000Z')
    expect(moved).toBe('2026-11-07T10:00:00.000Z')
    const h = loadHistory()
    expect(h.map((w) => w.sessionTitle)).toEqual(['A', 'B'])
    expect(h[0].notes).toBe('keep me')
    expect(changeWorkoutDate('missing', '2026-11-07T10:00:00.000Z')).toBeNull()
  })

  it('re-checks records after a session moves before another', () => {
    const e = (w) => [{ exerciseId: 'back_squat', name: 'Squat', sets: [{ weight: w, reps: 5, done: true }] }]
    const history = [
      { date: '2026-11-05', entries: e(200), prs: [] },
      { date: '2026-11-02', entries: e(180), prs: [] },
    ]
    // 180 moved to after the 200 session: it is no longer a record, and 200 is.
    const moved = [{ ...history[1], date: '2026-11-06' }, history[0]]
    const updates = recomputeRecordsFrom(moved, '2026-11-02', {})
    const by = Object.fromEntries(updates.map((u) => [u.date, u.prs.length]))
    expect(by['2026-11-06']).toBe(0)
    expect(updates.map((u) => u.date)).toEqual(['2026-11-05', '2026-11-06'])
  })
})

describe('several sessions in progress', () => {
  const s = (dayIndex, savedAt, extra = {}) => ({ programId: 'p1', dayIndex, sessionTitle: `Day ${dayIndex}`, exercises: [{ id: 'x' }], sets: {}, savedAt, ...extra })

  it('keeps one per day instead of overwriting', () => {
    saveActiveSession(s(0, 1))
    saveActiveSession(s(1, 2))
    expect(loadActiveSessions().map((x) => x.dayIndex)).toEqual([1, 0])
    expect(loadActiveSession('p1', 0).sessionTitle).toBe('Day 0')
    expect(loadActiveSession().dayIndex).toBe(1) // most recent
  })

  it('updates the same day in place', () => {
    saveActiveSession(s(0, 1))
    saveActiveSession(s(0, 5, { logDate: '2026-11-09T10:00:00.000Z' }))
    expect(loadActiveSessions()).toHaveLength(1)
    expect(loadActiveSession('p1', 0).logDate).toBe('2026-11-09T10:00:00.000Z')
  })

  it('clears just one day, or all', () => {
    saveActiveSession(s(0, 1))
    saveActiveSession(s(1, 2))
    clearActiveSession('p1', 1)
    expect(loadActiveSessions().map((x) => x.dayIndex)).toEqual([0])
    clearActiveSession('p1', 0)
    expect(loadActiveSession()).toBeNull()
    saveActiveSession(s(0, 1))
    clearActiveSession()
    expect(loadActiveSessions()).toEqual([])
  })

  it('reads the old single-session format', () => {
    window.localStorage.setItem('simple-lift:activeSession', JSON.stringify(s(2, 9)))
    expect(loadActiveSession('p1', 2).sessionTitle).toBe('Day 2')
    saveActiveSession(s(0, 10))
    expect(loadActiveSessions().map((x) => x.dayIndex)).toEqual([0, 2])
  })
})
