// Sharing a program by code, and importing it as a NEW program the recipient
// can tune to their own limits. The privacy edge — never leaking the sharer's
// 1RMs — and the "always a new program" guarantee get explicit coverage.
import { describe, it, expect } from 'vitest'
import {
  encodeProgramCode, decodeProgramCode, buildImportedProgram, shareableProgram,
  summarizeProgram, isProgramCode, IMPORT_DEFAULTS,
} from './programShare.js'

const program = (over = {}) => ({
  id: 'p1',
  createdAt: '2026-01-01T00:00:00.000Z',
  name: 'My Split',
  source: 'custom',
  schedule: { mode: 'rotation', trainingDays: [1, 3, 5], pointer: 2 },
  days: [
    {
      title: 'Day 1',
      exercises: [
        { id: 'back_squat', name: 'Back Squat', pattern: 'squat', regions: ['legs'], sets: 3, repLow: 5, repHigh: 5, restSec: 180, startWeight: 225, progression: { scheme: 'lp', weight: 225, fails: 1 } },
        { id: 'bench_press', name: 'Bench Press', pattern: 'horiz_push', regions: ['chest'], sets: 3, repLow: 5, repHigh: 5, restSec: 180, startWeight: 185 },
      ],
    },
  ],
  ...over,
})

describe('round-trip', () => {
  it('encodes to a recognisable code and decodes back', async () => {
    const code = await encodeProgramCode(program())
    expect(code.startsWith('SLPROG1:')).toBe(true)
    expect(isProgramCode(code)).toBe(true)
    const back = await decodeProgramCode(code)
    expect(back.name).toBe('My Split')
    expect(back.days[0].exercises).toHaveLength(2)
  })

  it('survives stray whitespace from a wrapped paste', async () => {
    const code = await encodeProgramCode(program())
    const wrapped = code.slice(0, 12) + '\n  ' + code.slice(12)
    const back = await decodeProgramCode(wrapped)
    expect(back.name).toBe('My Split')
  })

  it('rejects nonsense and non-program codes', async () => {
    await expect(decodeProgramCode('hello')).rejects.toThrow(/program share code/)
    await expect(decodeProgramCode('SLPROG1:@@notbase64@@')).rejects.toThrow(/incomplete or corrupted/)
    await expect(decodeProgramCode('')).rejects.toThrow()
  })

  it('does not treat a backup code as a program code', () => {
    expect(isProgramCode('SLIFT2:abc')).toBe(false)
  })
})

describe('privacy', () => {
  it('strips the sharer’s id and timestamps', () => {
    const s = shareableProgram(program())
    expect(s.id).toBeUndefined()
    expect(s.createdAt).toBeUndefined()
  })

  it('never shares the GZCLP wizard’s saved 1RMs', () => {
    const gz = program({ source: 'gzclp-wizard', gzclp: { units: 'lbs', seedMode: 'oneRM', maxes: { back_squat: 315, bench_press: 225 } } })
    const s = shareableProgram(gz)
    expect(s.gzclp.maxes).toBeUndefined()
    expect(s.gzclp.units).toBe('lbs') // the non-private config still travels
  })

  it('strips the sharer’s place in the rotation', () => {
    expect(shareableProgram(program()).schedule.pointer).toBeUndefined()
  })
})

describe('import options', () => {
  const shared = () => shareableProgram(program())

  it('blanks starting weights by default (their numbers are not mine)', () => {
    const p = buildImportedProgram(shared(), IMPORT_DEFAULTS)
    expect(p.days[0].exercises[0].startWeight).toBe('')
    expect(p.days[0].exercises[1].startWeight).toBe('')
  })

  it('keeps starting weights when asked', () => {
    const p = buildImportedProgram(shared(), { weights: 'theirs' })
    expect(p.days[0].exercises[0].startWeight).toBe(225)
  })

  it('resets progression to a fresh start by default', () => {
    const p = buildImportedProgram(shared(), IMPORT_DEFAULTS)
    expect(p.days[0].exercises[0].progression).toEqual({ scheme: 'lp', weight: null, fails: 0 })
  })

  it('keeps progression state when asked, but still clears weights if weights are blank', () => {
    const p = buildImportedProgram(shared(), { progress: 'keep', weights: 'blank' })
    expect(p.days[0].exercises[0].progression.fails).toBe(1) // their state kept
    expect(p.days[0].exercises[0].progression.weight).toBeNull() // but not their weight
  })

  it('keeps everything when keeping progress AND weights', () => {
    const p = buildImportedProgram(shared(), { progress: 'keep', weights: 'theirs' })
    expect(p.days[0].exercises[0].progression).toEqual({ scheme: 'lp', weight: 225, fails: 1 })
  })

  it('resets a 5/3/1 training max on a fresh import', () => {
    const bbb = program({
      days: [{ title: 'D', exercises: [{ id: 'back_squat', name: 'Squat', pattern: 'squat', regions: ['legs'], sets: 3, repLow: 5, repHigh: 5, restSec: 180, progression: { scheme: '531', week: 2, cycle: 3, tm: 285 } }] }],
    })
    const p = buildImportedProgram(shareableProgram(bbb), IMPORT_DEFAULTS)
    expect(p.days[0].exercises[0].progression).toEqual({ scheme: '531', week: 0, cycle: 0, tm: null })
  })

  it('keeps the sharer’s schedule by default, minus their rotation pointer', () => {
    const p = buildImportedProgram(shared(), IMPORT_DEFAULTS)
    expect(p.schedule.trainingDays).toEqual([1, 3, 5])
    expect(p.schedule.pointer).toBeUndefined()
  })

  it('gives a neutral schedule matching the day count when the recipient wants their own', () => {
    // The sample is a 1-day program → one training day.
    expect(buildImportedProgram(shared(), { schedule: 'mine' }).schedule.trainingDays).toEqual([3])
    // A 3-day program → the classic Mon/Wed/Fri spread.
    const threeDay = program({ days: [{ title: 'A', exercises: [{ id: 'back_squat', sets: 3, repLow: 5, repHigh: 5 }] }, { title: 'B', exercises: [{ id: 'bench_press', sets: 3, repLow: 5, repHigh: 5 }] }, { title: 'C', exercises: [{ id: 'deadlift', sets: 1, repLow: 5, repHigh: 5 }] }] })
    expect(buildImportedProgram(shareableProgram(threeDay), { schedule: 'mine' }).schedule.trainingDays).toEqual([1, 3, 5])
  })
})

describe('always a new, editable program', () => {
  it('produces no id, so addProgram must mint a fresh one', () => {
    expect(buildImportedProgram(shareableProgram(program()), {}).id).toBeUndefined()
  })

  it('marks the import as a custom program the recipient can edit', () => {
    expect(buildImportedProgram(shareableProgram(program()), {}).source).toBe('custom')
  })

  it('disambiguates a name that already exists so it never looks like an overwrite', () => {
    const p = buildImportedProgram(shareableProgram(program()), {}, ['My Split'])
    expect(p.name).toBe('My Split (2)')
  })

  it('counts up past multiple existing copies', () => {
    const p = buildImportedProgram(shareableProgram(program()), {}, ['My Split', 'My Split (2)'])
    expect(p.name).toBe('My Split (3)')
  })

  it('keeps the original name when it is free', () => {
    expect(buildImportedProgram(shareableProgram(program()), {}, ['Other']).name).toBe('My Split')
  })
})

describe('summary for the preview', () => {
  it('counts days and exercises and flags whether weights are attached', () => {
    const s = summarizeProgram(shareableProgram(program()))
    expect(s.days).toBe(1)
    expect(s.exercises).toBe(2)
    expect(s.hasWeights).toBe(true)
    expect(s.schemes).toContain('lp')
  })

  it('flags exercises this app version does not recognise', () => {
    const weird = program({ days: [{ title: 'D', exercises: [{ id: 'not_a_real_exercise', name: 'Mystery', sets: 3, repLow: 5, repHigh: 5 }] }] })
    expect(summarizeProgram(weird).unknown).toBe(1)
  })
})
