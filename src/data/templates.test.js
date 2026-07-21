// Templates are data, and data rots quietly: a typo'd exercise id or a day with
// no exercises would only surface when a user loaded that program. These checks
// keep every shipped program structurally sound.
import { describe, it, expect } from 'vitest'
import { TEMPLATES, instantiateTemplate } from './templates.js'
import { EXERCISE_BY_ID } from './exercises.js'
import { estimateSessionMinutes, sessionLengthLabel } from '../lib/duration.js'

describe('every template', () => {
  it.each(TEMPLATES.map((t) => [t.name, t]))('%s is well formed', (_name, t) => {
    expect(t.templateId).toBeTruthy()
    expect(t.days.length).toBeGreaterThan(0)
    expect(t.level).toBeTruthy()
    expect(t.bestFor).toBeTruthy()
    // The collapsed card shows these, so they must exist on every program.
    expect(t.tags.length).toBeGreaterThan(0)
    expect(t.equipment).toBeTruthy()
  })

  it.each(TEMPLATES.map((t) => [t.name, t]))('%s references only real exercises', (_name, t) => {
    for (const day of t.days) {
      expect(day.exercises.length).toBeGreaterThan(0)
      for (const ex of day.exercises) {
        expect(EXERCISE_BY_ID[ex.id], `unknown exercise: ${ex.id}`).toBeTruthy()
        for (const altId of ex.alts || []) {
          expect(EXERCISE_BY_ID[altId], `unknown alt: ${altId}`).toBeTruthy()
        }
      }
    }
  })

  it.each(TEMPLATES.map((t) => [t.name, t]))('%s has a believable session length', (_name, t) => {
    const mins = t.days.map(estimateSessionMinutes)
    expect(Math.min(...mins)).toBeGreaterThanOrEqual(15)
    expect(Math.max(...mins)).toBeLessThanOrEqual(120)
    expect(sessionLengthLabel(t)).toMatch(/min/)
  })

  it('has unique ids', () => {
    const ids = TEMPLATES.map((t) => t.templateId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // The workout screen keys its set-tracking map by exercise id, so the same
  // exercise twice in one day silently shares one set of rows — the second
  // entry overwrites the first. The Builder blocks this for user-made programs;
  // templates need the same guarantee.
  it.each(TEMPLATES.map((t) => [t.name, t]))('%s never repeats an exercise within a day', (_name, t) => {
    for (const day of t.days) {
      const ids = day.exercises.map((e) => e.id)
      expect(new Set(ids).size, `${day.title} repeats an exercise`).toBe(ids.length)
    }
  })
})

describe('instantiation', () => {
  it('strips presentation-only fields from the saved program', () => {
    const p = instantiateTemplate('stronglifts')
    expect(p.description).toBeUndefined()
    expect(p.pros).toBeUndefined()
    expect(p.templateId).toBeUndefined()
    expect(p.days.length).toBe(2)
  })

  it('deep-clones so editing one program cannot corrupt the template', () => {
    const a = instantiateTemplate('stronglifts')
    a.days[0].exercises[0].sets = 99
    expect(instantiateTemplate('stronglifts').days[0].exercises[0].sets).toBe(5)
  })
})

describe('5/3/1 Boring But Big', () => {
  const t = TEMPLATES.find((x) => x.templateId === 'wendler531_bbb')

  it('trains each of the four lifts once a week', () => {
    const mains = t.days.map((d) => d.exercises[0].id)
    expect([...mains].sort()).toEqual(['back_squat', 'bench_press', 'deadlift', 'overhead_press'])
  })

  it('pairs every main lift with 5×10 of a second big lift', () => {
    for (const day of t.days) {
      const [main, bbb] = day.exercises
      expect(main.progression.scheme).toBe('531')
      expect([bbb.sets, bbb.repHigh]).toEqual([5, 10])
      // Opposite-lift pairing, so it must NOT be the same movement — that would
      // collide in the id-keyed set map.
      expect(bbb.id).not.toBe(main.id)
      expect(EXERCISE_BY_ID[bbb.id].compound).toBe(true)
    }
  })

  it('starts every lift with an unset training max', () => {
    for (const day of t.days) expect(day.exercises[0].progression.tm).toBeNull()
  })
})

describe('Dumbbell Full Body', () => {
  const t = TEMPLATES.find((x) => x.templateId === 'db_fullbody')

  it('never requires a barbell or a rack', () => {
    for (const day of t.days) {
      for (const ex of day.exercises) {
        const requires = EXERCISE_BY_ID[ex.id].requires || []
        expect(requires).not.toContain('barbell')
        expect(requires).not.toContain('rack')
      }
    }
  })

  it('offers a fallback for anything needing gear beyond dumbbells', () => {
    // A bench or a pull-up bar is optional kit, so those moves must degrade.
    for (const day of t.days) {
      for (const ex of day.exercises) {
        const requires = EXERCISE_BY_ID[ex.id].requires || []
        const needsExtra = requires.some((r) => !['dumbbells'].includes(r))
        if (needsExtra) expect(ex.alts, `${ex.id} needs a fallback`).toBeTruthy()
      }
    }
  })

  it('covers squat, hinge, push, and pull', () => {
    const patterns = new Set(t.days.flatMap((d) => d.exercises.map((e) => e.pattern)))
    for (const p of ['squat', 'hinge', 'horiz_pull']) expect(patterns).toContain(p)
    expect(patterns.has('horiz_push') || patterns.has('vert_push')).toBe(true)
  })
})
