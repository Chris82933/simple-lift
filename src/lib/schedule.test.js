// C1: a rotation program's pointer must never yield `days[pointer] === undefined`.
// The trigger: a rotation program (template / GZCLP wizard) gets edited down to
// fewer days while `schedule.pointer` keeps its old, now out-of-range value —
// Today.jsx then reads `session.title` on whatever pickSession hands back.
import { describe, it, expect } from 'vitest'
import { pickSession, trainingWeekdays, restWarnings, WEEKDAY_SHORT } from './schedule.js'

const rotationProgram = (over = {}) => ({
  id: 'p1',
  name: 'Rotation',
  days: [{ title: 'Day A', exercises: [] }, { title: 'Day B', exercises: [] }, { title: 'Day C', exercises: [] }],
  schedule: { mode: 'rotation', trainingDays: [1, 3, 5], pointer: 0 },
  ...over,
})

describe('pickSession — rotation mode pointer safety', () => {
  it('returns the pointed-at day when the pointer is in range', () => {
    const p = rotationProgram({ schedule: { mode: 'rotation', trainingDays: [1, 3, 5], pointer: 1 } })
    const r = pickSession(p, 1)
    expect(r.session.title).toBe('Day B')
    expect(r.index).toBe(1)
  })

  it('clamps a pointer left stale after the program lost days (>= days.length)', () => {
    // Program edited down from 5 days to 3; pointer still says 4.
    const p = rotationProgram({ schedule: { mode: 'rotation', trainingDays: [1, 3, 5], pointer: 4 } })
    const r = pickSession(p, 1)
    expect(r.session).toBeDefined()
    expect(r.session.title).toBeTypeOf('string')
  })

  it('clamps a negative pointer', () => {
    const p = rotationProgram({ schedule: { mode: 'rotation', trainingDays: [1, 3, 5], pointer: -1 } })
    const r = pickSession(p, 1)
    expect(r.session).toBeDefined()
  })

  it('treats a missing/undefined pointer as 0 rather than crashing', () => {
    const p = rotationProgram({ schedule: { mode: 'rotation', trainingDays: [1, 3, 5] } })
    const r = pickSession(p, 1)
    expect(r.session.title).toBe('Day A')
    expect(r.index).toBe(0)
  })

  it('returns null instead of an undefined session when days is empty', () => {
    const p = rotationProgram({ days: [], schedule: { mode: 'rotation', trainingDays: [1, 3, 5], pointer: 2 } })
    expect(pickSession(p, 1)).toBeNull()
  })

  it('still picks the right day for fixed-weekday programs (unaffected)', () => {
    const p = {
      id: 'p2',
      days: [{ title: 'Push', weekday: 1, exercises: [] }, { title: 'Pull', weekday: 3, exercises: [] }],
      schedule: { mode: 'fixed' },
    }
    const r = pickSession(p, 1)
    expect(r.session.title).toBe('Push')
    expect(r.isToday).toBe(true)
  })
})

describe('trainingWeekdays / restWarnings (unchanged behaviour, sanity check)', () => {
  it('reads rotation training days from schedule.trainingDays', () => {
    const p = rotationProgram()
    expect(trainingWeekdays(p)).toEqual([1, 3, 5])
  })

  it('flags back-to-back days', () => {
    const msg = restWarnings([1, 2, 4])
    expect(msg).toContain(`${WEEKDAY_SHORT[1]}→${WEEKDAY_SHORT[2]}`)
  })
})
