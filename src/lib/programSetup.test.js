// Starting weights, the program list's groups/filters, and the onboarding
// recommendation.
import { describe, it, expect } from 'vitest'
import { TEMPLATES, instantiateTemplate } from '../data/templates.js'
import { seedProgramWeights, seedExerciseWeight, lightTrainingMax, liftsToAsk, BAR_WEIGHT } from './seedWeights.js'
import { PROGRAM_GROUPS, UNCATALOGUED, EQUIP_FILTERS, matchesFilter, matchesSearch } from '../data/programCatalog.js'
import { recommendPlan, ONBOARDING_GOALS, TRAIN_PLACES, equipmentFor, whyLine, generatedName } from './recommend.js'
import { exMeasure } from '../data/exercises.js'

const loaded = (e) => e.load !== false

describe('seedWeights', () => {
  for (const units of ['lbs', 'kg']) {
    it(`never leaves a loaded lift blank in any ready-made program (${units}, no saved maxes)`, () => {
      for (const t of TEMPLATES) {
        const p = seedProgramWeights(instantiateTemplate(t.templateId), { maxes: {}, units })
        for (const d of p.days) for (const e of d.exercises.filter(loaded)) {
          if (e.progression?.scheme === '531') {
            expect(e.progression.tm, `${t.templateId}/${e.id}`).toBeGreaterThan(0)
            // Week 1's lightest set (65%) is never below the empty bar.
            expect(e.progression.tm * 0.65).toBeGreaterThanOrEqual(BAR_WEIGHT[units])
          } else {
            expect(Number(e.startWeight), `${t.templateId}/${e.id}`).toBeGreaterThan(0)
            if (e.progression && 'weight' in e.progression) expect(Number(e.progression.weight)).toBeGreaterThan(0)
          }
        }
      }
    })
  }

  it('uses a saved max, starting linear programs a little under it', () => {
    const p = seedProgramWeights(instantiateTemplate('stronglifts'), { maxes: { back_squat: { oneRM: 300 } }, units: 'lbs' })
    const squat = p.days.flatMap((d) => d.exercises).find((e) => e.id === 'back_squat')
    expect(squat.startWeight).toBeGreaterThan(150)
    expect(squat.startWeight).toBeLessThan(260)
    expect(squat.progression.weight).toBe(squat.startWeight)
  })

  it('sets a 5/3/1 training max from a saved max', () => {
    const p = seedProgramWeights(instantiateTemplate('wendler531_bbb'), { maxes: { bench_press: { oneRM: 200 } }, units: 'lbs' })
    const bench = p.days.flatMap((d) => d.exercises).find((e) => e.id === 'bench_press' && e.progression?.scheme === '531')
    expect(bench.progression.tm).toBe(180)
  })

  it('keeps a weight that is already set, and leaves bodyweight moves alone', () => {
    expect(seedExerciseWeight({ id: 'back_squat', load: true, repHigh: 5, startWeight: 135 }).startWeight).toBe(135)
    const bw = { id: 'pushup', load: false, repHigh: 10, startWeight: '' }
    expect(seedExerciseWeight(bw)).toBe(bw)
  })

  it('never seeds a barbell lift below the empty bar', () => {
    const e = seedExerciseWeight({ id: 'overhead_press', load: true, repLow: 5, repHigh: 5, startWeight: '' }, { maxes: { overhead_press: { oneRM: 40 } }, units: 'lbs' })
    expect(e.startWeight).toBeGreaterThanOrEqual(45)
    expect(lightTrainingMax('kg') * 0.65).toBeGreaterThanOrEqual(20)
  })

  it('asks about 5/3/1 main lifts first, each lift once', () => {
    const lifts = liftsToAsk(instantiateTemplate('wendler531_bbb'))
    expect(lifts[0].needsTm).toBe(true)
    // All four main lifts, even where one also appears as 5×10 volume first.
    expect(lifts.filter((l) => l.needsTm).map((l) => l.id).sort()).toEqual(['back_squat', 'bench_press', 'deadlift', 'overhead_press'])
    expect(new Set(lifts.map((l) => l.id)).size).toBe(lifts.length)
    for (const l of lifts) expect(exMeasure({ id: l.id }).type).toBe('reps')
  })
})

describe('programCatalog', () => {
  it('puts every program in exactly one group', () => {
    expect(UNCATALOGUED).toEqual([])
    const all = PROGRAM_GROUPS.flatMap((g) => g.ids)
    expect(new Set(all).size).toBe(all.length)
    const ids = new Set(TEMPLATES.map((t) => t.templateId))
    for (const id of all) expect(ids.has(id), id).toBe(true)
  })

  it('lets every program show up under at least one equipment filter besides All', () => {
    for (const t of TEMPLATES) {
      const hits = EQUIP_FILTERS.filter((f) => f.id !== 'all' && matchesFilter(t, f.id))
      expect(hits.length, t.templateId).toBeGreaterThan(0)
    }
  })

  it('keeps barbell programs out of the dumbbell filter', () => {
    const byId = Object.fromEntries(TEMPLATES.map((t) => [t.templateId, t]))
    expect(matchesFilter(byId.greyskull, 'dumbbell')).toBe(false)
    expect(matchesFilter(byId.db_fullbody, 'dumbbell')).toBe(true)
    expect(matchesFilter(byId.bw_foundations, 'bodyweight')).toBe(true)
  })

  it('searches names and plain descriptions', () => {
    const byId = Object.fromEntries(TEMPLATES.map((t) => [t.templateId, t]))
    expect(matchesSearch(byId.wendler531_bbb, '5/3/1')).toBe(true)
    expect(matchesSearch(byId.phul, 'upper lower')).toBe(true)
    expect(matchesSearch(byId.phul, 'zzz')).toBe(false)
  })
})

describe('recommendPlan', () => {
  it('always recommends something real, with up to two different alternatives', () => {
    for (const g of ONBOARDING_GOALS) for (const place of TRAIN_PLACES) for (const experience of ['new', 'some', 'experienced']) for (const days of [2, 3, 4, 5, 6]) {
      for (const picks of [[], ['dumbbells'], ['kettlebells'], ['dumbbells', 'pullup_bar']]) {
        const r = recommendPlan({ goal: g.id, experience, place: place.id, days, picks })
        expect(['template', 'generated', 'bone']).toContain(r.primary.kind)
        expect(r.alts.length).toBeLessThanOrEqual(2)
        const keys = [r.primary, ...r.alts].map((o) => o.templateId || o.kind)
        expect(new Set(keys).size).toBe(keys.length)
      }
    }
  })

  it('never offers a gym program to someone with no equipment', () => {
    for (const g of ONBOARDING_GOALS) {
      const r = recommendPlan({ goal: g.id, experience: 'new', place: 'none', days: 3 })
      const ids = [r.primary, ...r.alts].filter((o) => o.kind === 'template').map((o) => o.templateId)
      const byId = Object.fromEntries(TEMPLATES.map((t) => [t.templateId, t]))
      for (const id of ids) if (g.id !== 'bones') expect(matchesFilter(byId[id], 'barbell'), `${g.id}→${id}`).toBe(false)
    }
  })

  it('sends bone health to the bone program', () => {
    expect(recommendPlan({ goal: 'bones', experience: 'new', place: 'gym', days: 2 }).primary.kind).toBe('bone')
  })

  it('maps a place to equipment', () => {
    expect(equipmentFor('none')).toEqual([])
    expect(equipmentFor('home', ['barbell'])).toEqual(expect.arrayContaining(['barbell', 'rack']))
    expect(equipmentFor('gym', [], 'general')).not.toContain('hangboard')
    expect(equipmentFor('gym', [], 'climbing')).toContain('hangboard')
  })

  it('explains itself in plain words', () => {
    expect(whyLine({ goal: 'strength', experience: 'new', place: 'gym', days: 3 })).toMatch(/new to lifting.*gym.*3×.*get stronger/)
    expect(generatedName({ goal: 'size', days: 4 })).toBe('4-Day Muscle Plan')
  })
})
