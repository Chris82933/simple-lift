// reviewSession is the central post-workout orchestrator: it routes each
// exercise to the right progression engine (generic, GZCLP, 5/3/1, lp/gslp,
// or the bodyweight ladder) and turns the result into persisted state plus
// opt-in suggestions. applyChoices then has to turn a chosen suggestion back
// into a correct next-session exercise entry.
import { describe, it, expect } from 'vitest'
import { reviewSession, applyChoices, INCREMENTS } from './sessionReview.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { exerciseEntryFromLibrary } from './exerciseEntry.js'

const doneSet = (weight, reps, extra = {}) => ({ weight, reps, done: true, ...extra })
const sets = (weight, reps, n) => Array.from({ length: n }, () => doneSet(weight, reps))

describe('reviewSession — generic (manual/linear/double-progression) exercises', () => {
  const row = {
    id: 'ex1', name: 'Row', pattern: 'horiz_pull', regions: ['back'], compound: true,
    load: true, sets: 3, repLow: 8, repHigh: 10,
  }

  it('suggests a load increase once every set tops the rep range', () => {
    const setsMap = { ex1: sets(100, 10, 3) }
    const { suggestions, persist } = reviewSession({ exercises: [row] }, setsMap, {}, 'lbs', 'manual')
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({ exId: 'ex1', type: 'load', base: 100, hitTop: true })
    expect(persist[0]).toMatchObject({ exId: 'ex1', startWeight: 100 })
  })

  it('does not suggest anything when the working sets fell short of the rep range', () => {
    const setsMap = { ex1: sets(100, 6, 3) } // completed all sets, but under repHigh
    const { suggestions, persist } = reviewSession({ exercises: [row] }, setsMap, {}, 'lbs', 'manual')
    expect(suggestions).toEqual([])
    expect(persist[0]).toMatchObject({ exId: 'ex1', startWeight: 100 })
  })

  it('excludes warm-up sets from both the judgement and the recorded weight', () => {
    const setsMap = { ex1: [doneSet(135, 10, { warmup: true }), doneSet(95, 10)] }
    const oneSetRow = { ...row, sets: 1 }
    const { suggestions } = reviewSession({ exercises: [oneSetRow] }, setsMap, {}, 'lbs', 'manual')
    // If the warm-up counted, base would be 135 (and 1 working set wouldn't
    // even be enough sets logged); with it excluded, base is the 95 lb work set.
    expect(suggestions[0].base).toBe(95)
  })

  it('leaves an exercise untouched (just remembering the entered weight) when nothing was ticked done', () => {
    const setsMap = { ex1: [{ weight: 100, reps: 10, done: false }] }
    const { suggestions, persist } = reviewSession({ exercises: [row] }, setsMap, {}, 'lbs', 'manual')
    expect(suggestions).toEqual([])
    // The weight is remembered (it came off the row, done or not) even though
    // nothing was completed, so next session's log starts prefilled.
    expect(persist).toEqual([{ exId: 'ex1', startWeight: 100 }])
  })
})

describe('reviewSession — GZCLP scheme', () => {
  const squat = {
    id: 'back_squat', name: 'Squat', pattern: 'squat', regions: ['legs', 'core'], compound: true,
    load: true, sets: 5, repLow: 3, repHigh: 3,
    progression: { scheme: 't1', stage: 0, weight: 225 },
  }

  it('suggests the GZCLP jump on a clean session', () => {
    const setsMap = { back_squat: sets(225, 3, 5) }
    const { suggestions, persist } = reviewSession({ exercises: [squat] }, setsMap, {}, 'lbs')
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({ exId: 'back_squat', type: 'load', base: 225, isGzclp: true })
    expect(persist[0].progression.weight).toBe(225) // stays at the current weight until the user confirms
  })

  it('auto-applies a stage drop on a miss, with no suggestion, and reports it via autoNotes', () => {
    const setsMap = { back_squat: sets(225, 2, 5) } // needed 3 reps, got 2
    const { suggestions, autoNotes, persist } = reviewSession({ exercises: [squat] }, setsMap, {}, 'lbs')
    expect(suggestions).toEqual([])
    expect(persist[0].progression.stage).toBe(1)
    // Any GZCLP miss — a mid-run stage drop or a full stage-1 reset — comes
    // back as kind 'deload' from gzclp.js, so both are auto-noted.
    expect(autoNotes).toHaveLength(1)
    expect(autoNotes[0]).toContain('dropping to Stage 2')
  })
})

describe('reviewSession — 5/3/1 scheme', () => {
  const ohp = {
    id: 'overhead_press', name: 'OHP', pattern: 'vert_push', regions: ['shoulders'], compound: true,
    load: true, sets: 3, repLow: 5, repHigh: 5,
    progression: { scheme: '531', week: 0, tm: 150, cycle: 0 },
  }

  it('never raises a suggestion — it advances the week and reports via autoNotes', () => {
    const setsMap = { overhead_press: sets(112, 5, 3) }
    const { suggestions, autoNotes, persist } = reviewSession({ exercises: [ohp] }, setsMap, {}, 'lbs')
    expect(suggestions).toEqual([])
    expect(autoNotes).toHaveLength(1)
    expect(persist[0].progression.week).toBe(1)
  })
})

describe('reviewSession — bodyweight ladder', () => {
  const pushupEntry = exerciseEntryFromLibrary(EXERCISE_BY_ID.pushup, { sets: 3, repLow: 10, repHigh: 10 })

  it('offers to level up once the top of the range is cleared on every set', () => {
    const setsMap = { [pushupEntry.id]: sets(0, 12, 3) }
    const { suggestions } = reviewSession({ exercises: [pushupEntry] }, setsMap, {}, 'lbs')
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({ exId: 'pushup', type: 'levelUp', nextId: 'decline_pushup' })
  })

  it('offers to level down when even the best set misses the bottom of the range', () => {
    const setsMap = { [pushupEntry.id]: sets(0, 4, 3) } // repLow is 10
    const { suggestions } = reviewSession({ exercises: [pushupEntry] }, setsMap, {}, 'lbs')
    expect(suggestions).toHaveLength(1)
    expect(suggestions[0]).toMatchObject({ exId: 'pushup', type: 'levelDown', prevId: 'knee_pushup' })
  })

  it('suggests chasing more reps at the top of the ladder (no nextId)', () => {
    const topEntry = { ...pushupEntry, id: 'one_arm_pushup', nextId: null, prevId: 'pushup' }
    const setsMap = { one_arm_pushup: sets(0, 10, 3) }
    const { suggestions } = reviewSession({ exercises: [topEntry] }, setsMap, {}, 'lbs')
    expect(suggestions[0]).toMatchObject({ type: 'reps', hitTop: true })
  })
})

describe('applyChoices', () => {
  const program = (exercises) => ({ id: 'p1', days: [{ title: 'Day A', exercises }] })

  it('keeping the suggestion leaves the exercise unchanged', () => {
    const ex = { id: 'ex1', name: 'Row', startWeight: 100 }
    const suggestions = [{ exId: 'ex1', base: 100 }]
    const out = applyChoices(program([ex]), 0, suggestions, { ex1: 'keep' })
    expect(out.days[0].exercises[0]).toBe(ex)
  })

  it('applying a weight increment on a plain exercise bumps startWeight', () => {
    const ex = { id: 'ex1', name: 'Row', startWeight: 100 }
    const suggestions = [{ exId: 'ex1', base: 100 }]
    const out = applyChoices(program([ex]), 0, suggestions, { ex1: 'w5' })
    expect(out.days[0].exercises[0].startWeight).toBe(105)
  })

  it('applying a weight increment on a GZCLP exercise re-stages and clears the fail streak', () => {
    const ex = {
      id: 'back_squat', name: 'Squat', pattern: 'squat', regions: ['legs'],
      progression: { scheme: 't1', stage: 1, weight: 225, fails: 2 },
    }
    const suggestions = [{ exId: 'back_squat', base: 225, isGzclp: true }]
    const out = applyChoices(program([ex]), 0, suggestions, { back_squat: 'w10' })
    const updated = out.days[0].exercises[0]
    expect(updated.progression.weight).toBe(235)
    expect(updated.progression.fails).toBe(0)
    expect(updated.progression.stage).toBe(1) // applyChoices doesn't change stage — it only re-renders it via applyStage
    expect(updated.startWeight).toBe(235)
  })

  it('applying "reps" bumps the rep target', () => {
    const ex = { id: 'ex1', name: 'Row', repHigh: 10 }
    const suggestions = [{ exId: 'ex1', reps: { to: 11, by: 1 } }]
    const out = applyChoices(program([ex]), 0, suggestions, { ex1: 'reps' })
    expect(out.days[0].exercises[0].repHigh).toBe(11)
  })

  it('leveling up rebuilds the entry from the next ladder exercise and preserves program fields', () => {
    const ex = exerciseEntryFromLibrary(EXERCISE_BY_ID.pushup, {
      sets: 3, repLow: 10, repHigh: 10, supersetNext: 'plank', restSec: 60,
    })
    const suggestions = [{ exId: 'pushup', nextId: 'decline_pushup', nextName: 'Decline Push-Up' }]
    const out = applyChoices(program([ex]), 0, suggestions, { pushup: 'levelUp' })
    const updated = out.days[0].exercises[0]
    expect(updated.id).toBe('decline_pushup')
    expect(updated.supersetNext).toBe('plank') // program field survives the level-up
    expect(updated.restSec).toBe(60)
    expect(updated.startWeight).toBe('')
  })

  it('leveling down rebuilds the entry from the previous ladder exercise and preserves program fields', () => {
    const ex = exerciseEntryFromLibrary(EXERCISE_BY_ID.pushup, {
      sets: 3, repLow: 10, repHigh: 10, supersetNext: 'plank',
    })
    const suggestions = [{ exId: 'pushup', prevId: 'knee_pushup', prevName: 'Knee Push-Up' }]
    const out = applyChoices(program([ex]), 0, suggestions, { pushup: 'levelDown' })
    const updated = out.days[0].exercises[0]
    expect(updated.id).toBe('knee_pushup')
    expect(updated.supersetNext).toBe('plank')
  })

  it('leaves exercises with no suggestion or no choice untouched', () => {
    const ex1 = { id: 'ex1', name: 'Row' }
    const ex2 = { id: 'ex2', name: 'Curl' }
    const out = applyChoices(program([ex1, ex2]), 0, [{ exId: 'ex1', base: 100 }], {})
    expect(out.days[0].exercises).toEqual([ex1, ex2])
  })
})

describe('INCREMENTS', () => {
  it('offers the standard small/medium/large jumps per unit system', () => {
    expect(INCREMENTS.lbs).toEqual([2.5, 5, 10])
    expect(INCREMENTS.kg).toEqual([1.25, 2.5, 5])
  })
})
