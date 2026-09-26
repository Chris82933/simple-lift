// The recovery creator must only ever reference real exercises and produce a
// structurally valid, brand-new program — a bad id or an empty day would only
// surface when a user loaded the routine.
import { describe, it, expect } from 'vitest'
import { RECOVERY_AREAS, buildRecoveryProgram, RECOVERY_DISCLAIMER } from './recovery.js'
import { EXERCISE_BY_ID } from './exercises.js'
import { estimateSessionMinutes } from '../lib/duration.js'

describe('every recovery area', () => {
  // The descriptive fields are the whole point of the feature: a routine that
  // doesn't say what it improves, or when NOT to use it, is the failure mode.
  it.each(RECOVERY_AREAS.map((a) => [a.label, a]))('%s says what it improves and who it is for', (_label, area) => {
    expect(Array.isArray(area.improves)).toBe(true)
    expect(area.improves.length).toBeGreaterThanOrEqual(3)
    expect(area.conditions).toBeTruthy()
    expect(area.timeline).toBeTruthy()
    expect(area.progression).toBeTruthy()
  })

  it.each(RECOVERY_AREAS.map((a) => [a.label, a]))('%s carries specific red flags, not a generic warning', (_label, area) => {
    expect(Array.isArray(area.notFor)).toBe(true)
    expect(area.notFor.length).toBeGreaterThanOrEqual(2)
    // Each must be a real, specific sign rather than "see a doctor".
    for (const flag of area.notFor) {
      expect(flag.length).toBeGreaterThan(25)
    }
  })

  // Naming a condition must never read as diagnosing the user with it.
  it.each(RECOVERY_AREAS.map((a) => [a.label, a]))('%s does not phrase conditions as a diagnosis', (_label, area) => {
    expect(area.conditions.toLowerCase()).not.toMatch(/you have|your (gtps|pfp|mtss|tendinopathy)/)
  })

  // `blurb` was written for every area and rendered nowhere for its whole life.
  it.each(RECOVERY_AREAS.map((a) => [a.label, a]))('%s has no leftover dead blurb field', (_label, area) => {
    expect(area.blurb).toBeUndefined()
  })

  it.each(RECOVERY_AREAS.map((a) => [a.label, a]))('%s references only real exercises', (_label, area) => {
    expect(area.exercises.length).toBeGreaterThanOrEqual(3)
    for (const e of area.exercises) {
      expect(EXERCISE_BY_ID[e.id], `unknown exercise: ${e.id}`).toBeTruthy()
      expect(e.sets).toBeGreaterThan(0)
      expect(e.high).toBeGreaterThanOrEqual(e.low)
    }
  })

  it.each(RECOVERY_AREAS.map((a) => [a.label, a]))('%s cites at least 3 sources and a rationale', (_label, area) => {
    expect(area.why).toBeTruthy()
    expect(area.sources.length).toBeGreaterThanOrEqual(3)
    for (const s of area.sources) {
      expect(s.url).toMatch(/^https?:\/\//)
      expect(s.label).toBeTruthy()
    }
  })

  it('has unique area ids', () => {
    const ids = RECOVERY_AREAS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers the newly requested issues', () => {
    const ids = RECOVERY_AREAS.map((a) => a.id)
    for (const id of ['shin_splints', 'neck', 'carpal_tunnel', 'tennis_elbow', 'office_neck_shoulder']) {
      expect(ids).toContain(id)
    }
  })
})

describe('buildRecoveryProgram', () => {
  it('returns null when nothing is selected', () => {
    expect(buildRecoveryProgram([])).toBeNull()
    expect(buildRecoveryProgram(['not_a_real_area'])).toBeNull()
  })

  it('makes one session per selected area', () => {
    const p = buildRecoveryProgram(['ankles', 'hips_glutes'])
    expect(p.days).toHaveLength(2)
    expect(p.days.map((d) => d.title)).toEqual(['Recovery · Ankles', 'Recovery · Hips & Glutes'])
  })

  it('is a fresh, editable program with no id and the disclaimer on each day', () => {
    const p = buildRecoveryProgram(['knees'])
    expect(p.id).toBeUndefined() // addProgram mints one → never overwrites
    expect(p.source).toBe('custom')
    expect(p.recovery.areas).toEqual(['knees'])
    for (const d of p.days) expect(d.note).toBe(RECOVERY_DISCLAIMER)
  })

  it('builds full exercise entries the workout can render', () => {
    const day = buildRecoveryProgram(['knees']).days[0]
    for (const ex of day.exercises) {
      expect(ex.name).toBeTruthy()
      expect(ex.pattern).toBeTruthy()
      expect(ex.sets).toBeGreaterThan(0)
    }
    // A hold (wall sit) keeps its seconds range; a rep move keeps reps.
    const wallSit = day.exercises.find((e) => e.id === 'wall_sit')
    expect([wallSit.repLow, wallSit.repHigh]).toEqual([20, 45])
  })

  it('never repeats an exercise within a day', () => {
    for (const a of RECOVERY_AREAS) {
      const day = buildRecoveryProgram([a.id]).days[0]
      const ids = day.exercises.map((e) => e.id)
      expect(new Set(ids).size, `${a.label} repeats an exercise`).toBe(ids.length)
    }
  })

  it('produces a believable session length', () => {
    const day = buildRecoveryProgram(['shoulders']).days[0]
    const mins = estimateSessionMinutes(day)
    expect(mins).toBeGreaterThanOrEqual(10)
    expect(mins).toBeLessThanOrEqual(45)
  })

  it('schedules multiple areas across the week', () => {
    expect(buildRecoveryProgram(['ankles', 'knees', 'shoulders']).schedule.trainingDays).toEqual([1, 3, 5])
  })
})

describe('the requested exercises exist', () => {
  it.each([
    'single_leg_drop_forward_jump', 'lunge_calf_raise', 'bosu_squat', 'straight_leg_raise', 'step_up',
  ])('%s is in the library', (id) => {
    expect(EXERCISE_BY_ID[id]).toBeTruthy()
  })
})


// Rehab work must be exempt from the app's ordinary progressive-overload logic.
describe('recovery programs are exempt from progression', () => {
  it('flags every generated exercise as rehab', () => {
    const p = buildRecoveryProgram(['knees', 'tennis_elbow'])
    for (const day of p.days) {
      for (const ex of day.exercises) {
        expect(ex.rehab, `${ex.name} is not flagged rehab`).toBe(true)
      }
    }
  })

  it('reviewSession suggests nothing for a completed rehab session', async () => {
    const { reviewSession } = await import('../lib/sessionReview.js')
    const p = buildRecoveryProgram(['hips_glutes'])
    const day = p.days[0]
    // Complete every set at the top of its range — the condition that would
    // normally trigger a level-up or weight increase.
    const setsMap = {}
    for (const ex of day.exercises) {
      setsMap[ex.id] = Array.from({ length: ex.sets }, () => ({ reps: ex.repHigh, weight: '', done: true }))
    }
    const out = reviewSession(day, setsMap, ['general'], 'lbs', 'double')
    expect(out.suggestions).toHaveLength(0)
    expect(out.autoNotes).toHaveLength(0)
  })

  it('keeps the rehab flag through an equipment swap', async () => {
    const { exerciseEntryFromLibrary } = await import('../lib/exerciseEntry.js')
    const p = buildRecoveryProgram(['shoulders'])
    const original = p.days[0].exercises[0]
    const swapped = exerciseEntryFromLibrary(EXERCISE_BY_ID.band_row, original)
    expect(swapped.rehab).toBe(true)
  })

  it('puts the safety note on every generated day', () => {
    const p = buildRecoveryProgram(['lower_back', 'neck'])
    for (const day of p.days) expect(day.note).toBe(RECOVERY_DISCLAIMER)
  })
})
