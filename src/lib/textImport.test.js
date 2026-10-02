import { describe, it, expect } from 'vitest'
import { parseTextProgram, findExercise } from './textImport.js'
import { matchInfo, EXERCISE_BY_ID } from '../data/exercises.js'

const SAMPLE = `My Upper/Lower

Upper A
Bench Press 4x6-8
Barbell Row - 4 x 6-8 @ 135
3x10 Dumbbell Curl
1. Pull-Up: 3 sets of 5+

Lower A:
Squat 3 sets x 5
- Romanian Deadlift 3×8–10
Underwater Basket Lift 2x12
`

describe('parseTextProgram', () => {
  const { program, exerciseCount, unknownNames } = parseTextProgram(SAMPLE)

  it('reads headings as days and the lone first heading as the name', () => {
    expect(program.name).toBe('My Upper/Lower')
    expect(program.days.map((d) => d.title)).toEqual(['Upper A', 'Lower A'])
    expect(exerciseCount).toBe(7)
  })

  it('reads sets × reps in the common spellings', () => {
    const [bench, row, curl, pull] = program.days[0].exercises
    expect([bench.id, bench.sets, bench.repLow, bench.repHigh]).toEqual(['bench_press', 4, 6, 8])
    expect([row.id, row.sets, row.startWeight]).toEqual(['barbell_row', 4, '135'])
    // sets-first, and a single rep number is both ends of the range
    expect([curl.sets, curl.repLow, curl.repHigh]).toEqual([3, 10, 10])
    // numbered list, "sets of", trailing + is AMRAP
    expect([pull.id, pull.sets, pull.repLow, pull.amrap]).toEqual(['pullup', 3, 5, true])
  })

  it('matches a bare lift name to the plain version, not a variation', () => {
    expect(program.days[1].exercises[0].id).toBe('back_squat')
    expect(program.days[1].exercises[1].id).toBe('romanian_dl')
  })

  it('keeps an unrecognised exercise under the name as written', () => {
    expect(unknownNames).toEqual(['Underwater Basket Lift'])
    const odd = program.days[1].exercises[2]
    expect(odd.name).toBe('Underwater Basket Lift')
    expect([odd.sets, odd.repLow]).toEqual([2, 12])
  })

  it('gives every day a weekday and library entries a rest time', () => {
    expect(program.days.map((d) => d.weekday)).toEqual([1, 2])
    expect(program.days[0].exercises[0].restSec).toBeGreaterThan(0)
  })

  it('returns no program for text with no exercises in it', () => {
    expect(parseTextProgram('hello there\nthis is not a program').program).toBeNull()
    expect(parseTextProgram('').program).toBeNull()
  })
})

describe('typo-tolerant search', () => {
  it('finds a lift through a misspelling', () => {
    expect(matchInfo(EXERCISE_BY_ID.bench_press, 'bech pres').match).toBe(true)
    expect(matchInfo(EXERCISE_BY_ID.deadlift, 'deadlfit').match).toBe(true)
    expect(findExercise('deadlfit')?.id).toBe('deadlift')
  })

  it('does not match unrelated words', () => {
    expect(matchInfo(EXERCISE_BY_ID.bench_press, 'squat').match).toBe(false)
    expect(matchInfo(EXERCISE_BY_ID.deadlift, 'curl').match).toBe(false)
  })

  it('still reports exact and alias hits as such', () => {
    expect(matchInfo(EXERCISE_BY_ID.bench_press, 'bench').via).toBe('name')
    expect(matchInfo(EXERCISE_BY_ID.hip_abduction, 'outer thigh').via).toBe('alias')
  })
})
