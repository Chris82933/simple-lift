// Weight handling: some bodyweight moves take OPTIONAL added weight (a belt on a
// pull-up, dumbbells in a reverse lunge, a plate on a plank). tracksLoad decides
// whether the log shows a weight box; loadIsOptional flags the bodyweight-first
// ones so it can be labelled optional. The flags live in the library, so both
// must still resolve from a materialised program entry that only carries `load`.
import { describe, it, expect } from 'vitest'
import { EXERCISES, EXERCISE_BY_ID, tracksLoad, loadIsOptional } from './exercises.js'

describe('tracksLoad — does the move take a weight at all', () => {
  it('is true for always-loaded lifts', () => {
    expect(tracksLoad(EXERCISE_BY_ID.back_squat)).toBe(true)
    expect(tracksLoad(EXERCISE_BY_ID.bench_press)).toBe(true)
  })

  it('is true for bodyweight moves that accept optional weight', () => {
    expect(tracksLoad(EXERCISE_BY_ID.reverse_lunge)).toBe(true) // addLoad (dumbbells)
    expect(tracksLoad(EXERCISE_BY_ID.pullup)).toBe(true)        // bwLoad (belt)
    expect(tracksLoad(EXERCISE_BY_ID.pushup)).toBe(true)        // addLoad (plate)
  })

  it('is false for pure bodyweight, bands, and cardio', () => {
    for (const id of ['running', 'band_curl', 'dead_bug', 'bird_dog', 'burpee']) {
      expect(tracksLoad(EXERCISE_BY_ID[id]), id).toBe(false)
    }
  })

  it('handles a null/undefined exercise', () => {
    expect(tracksLoad(undefined)).toBe(false)
    expect(tracksLoad(null)).toBe(false)
  })
})

describe('loadIsOptional — bodyweight but loadable', () => {
  it('is true for reverse lunges, pull-ups, weighted-plate holds', () => {
    for (const id of ['reverse_lunge', 'pullup', 'dip', 'plank', 'glute_bridge_hold']) {
      expect(loadIsOptional(EXERCISE_BY_ID[id]), id).toBe(true)
    }
  })

  it('is false for always-loaded lifts (weight is required, not optional)', () => {
    expect(loadIsOptional(EXERCISE_BY_ID.back_squat)).toBe(false)
    // A dedicated weighted pull-up entry is load:true + bwLoad — weight required.
    expect(loadIsOptional(EXERCISE_BY_ID.weighted_pullup)).toBe(false)
  })

  it('is false for pure bodyweight moves', () => {
    expect(loadIsOptional(EXERCISE_BY_ID.dead_bug)).toBe(false)
    expect(loadIsOptional(EXERCISE_BY_ID.running)).toBe(false)
  })
})

describe('the flags resolve from the library, not just the object passed in', () => {
  // Program/session entries are materialised with a boolean `load` and DROP the
  // bwLoad/addLoad flags — the helpers must still find them by id.
  const entry = { id: 'reverse_lunge', name: 'Reverse Lunge', load: false }

  it('an entry that lost its flags still tracks (optional) load', () => {
    expect(entry.addLoad).toBeUndefined()
    expect(tracksLoad(entry)).toBe(true)
    expect(loadIsOptional(entry)).toBe(true)
  })

  it('accepts a bare id too', () => {
    expect(tracksLoad('reverse_lunge')).toBe(true)
    expect(loadIsOptional('pullup')).toBe(true)
    expect(tracksLoad('running')).toBe(false)
  })
})

describe('data integrity', () => {
  it('reverse lunges can be weighted (the reported bug)', () => {
    expect(EXERCISE_BY_ID.reverse_lunge.addLoad).toBe(true)
    expect(EXERCISE_BY_ID.reverse_lunge.load).toBe(false)
  })

  it('wide-grip pull-ups are bodyweight-loaded like every other pull-up', () => {
    expect(EXERCISE_BY_ID.wide_pullup.bwLoad).toBe(true)
    expect(EXERCISE_BY_ID.pullup.bwLoad).toBe(true)
  })

  it('every addLoad move is a bodyweight (load:false) exercise', () => {
    for (const ex of EXERCISES.filter((e) => e.addLoad)) {
      expect(ex.load, ex.id).toBe(false)
    }
  })

  it('an optional-load move is never also a required-load move', () => {
    for (const ex of EXERCISES) {
      if (loadIsOptional(ex)) expect(ex.load, ex.id).toBe(false)
    }
  })

  it('bands are progressed by band, not added weight (no flags)', () => {
    for (const ex of EXERCISES.filter((e) => e.requires?.includes('bands'))) {
      expect(!!ex.addLoad, ex.id).toBe(false)
    }
  })
})
