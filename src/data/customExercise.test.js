// Custom exercises must look and behave exactly like library exercises once
// created, so every downstream lookup (measure, figure, pickers, records) works
// without special-casing.
import { describe, it, expect, beforeEach } from 'vitest'
import {
  makeCustomExercise, registerCustomExercises, unregisterCustomExercise,
  isCustomExercise, EXERCISE_BY_ID, EXERCISES, exMeasure, matchesQuery, MOVEMENT_TYPES,
} from './exercises.js'

describe('makeCustomExercise', () => {
  it('builds a library-shaped object with a custom id', () => {
    const ex = makeCustomExercise({ name: '  Meadows Row ', pattern: 'horiz_pull' })
    expect(isCustomExercise(ex.id)).toBe(true)
    expect(ex.name).toBe('Meadows Row') // trimmed
    expect(ex.pattern).toBe('horiz_pull')
    expect(ex.custom).toBe(true)
    expect(Array.isArray(ex.requires)).toBe(true)
    expect(Array.isArray(ex.regions)).toBe(true)
  })

  it('seeds regions and compound from the movement type', () => {
    const ex = makeCustomExercise({ name: 'X', pattern: 'squat' })
    const type = MOVEMENT_TYPES.find((t) => t.pattern === 'squat')
    expect(ex.regions).toEqual(type.regions)
    expect(ex.compound).toBe(true)
  })

  it('honours explicit regions, equipment, and compound overrides', () => {
    const ex = makeCustomExercise({
      name: 'X', pattern: 'core', regions: ['core', 'shoulders'], requires: ['barbell'], compound: true,
    })
    expect(ex.regions).toEqual(['core', 'shoulders'])
    expect(ex.requires).toEqual(['barbell'])
    expect(ex.compound).toBe(true)
  })

  it('is loaded by default but respects a bodyweight flag', () => {
    expect(makeCustomExercise({ name: 'X', pattern: 'squat' }).load).toBeUndefined() // defaults to loaded
    expect(makeCustomExercise({ name: 'X', pattern: 'core', load: false }).load).toBe(false)
  })

  it('encodes a timed hold and a distance move', () => {
    const hold = makeCustomExercise({ name: 'Plank+', pattern: 'core', measure: 'time' })
    expect(exMeasure(hold)).toEqual({ type: 'time', unit: 'sec' })
    const run = makeCustomExercise({ name: 'Sled Push', pattern: 'conditioning', measure: 'distance' })
    expect(exMeasure(run)).toEqual({ type: 'distance', unit: 'km' })
  })

  it('generates unique ids', () => {
    const a = makeCustomExercise({ name: 'A', pattern: 'squat' })
    const b = makeCustomExercise({ name: 'B', pattern: 'squat' })
    expect(a.id).not.toBe(b.id)
  })
})

describe('registry', () => {
  let ex
  beforeEach(() => {
    ex = makeCustomExercise({ name: 'My Move', pattern: 'horiz_push', id: 'custom_test1' })
    unregisterCustomExercise('custom_test1')
  })

  it('merges into the live library so lookups resolve', () => {
    registerCustomExercises([ex])
    expect(EXERCISE_BY_ID.custom_test1).toBeTruthy()
    expect(EXERCISES.some((e) => e.id === 'custom_test1')).toBe(true)
  })

  it('is idempotent — registering twice does not duplicate', () => {
    registerCustomExercises([ex])
    registerCustomExercises([ex])
    expect(EXERCISES.filter((e) => e.id === 'custom_test1')).toHaveLength(1)
  })

  it('is findable by name in the picker search', () => {
    registerCustomExercises([ex])
    expect(matchesQuery(EXERCISE_BY_ID.custom_test1, 'my move')).toBe(true)
  })

  it('unregister removes it from both the map and the list', () => {
    registerCustomExercises([ex])
    unregisterCustomExercise('custom_test1')
    expect(EXERCISE_BY_ID.custom_test1).toBeUndefined()
    expect(EXERCISES.some((e) => e.id === 'custom_test1')).toBe(false)
  })

  it('never touches a built-in exercise', () => {
    const before = EXERCISE_BY_ID.back_squat
    registerCustomExercises([ex])
    unregisterCustomExercise('custom_test1')
    expect(EXERCISE_BY_ID.back_squat).toBe(before)
  })
})

describe('landmine exercises', () => {
  it('are all in the library and need only a barbell', () => {
    const ids = ['landmine_squat', 'landmine_rdl', 'landmine_reverse_lunge', 'landmine_press', 'landmine_row', 'landmine_rotation']
    for (const id of ids) {
      const ex = EXERCISE_BY_ID[id]
      expect(ex, id).toBeTruthy()
      expect(ex.requires).toEqual(['barbell'])
    }
  })

  it('are searchable by common alternate names', () => {
    expect(matchesQuery(EXERCISE_BY_ID.landmine_row, 'meadows row')).toBe(true)
    expect(matchesQuery(EXERCISE_BY_ID.landmine_squat, 'front loaded squat')).toBe(true)
  })
})
