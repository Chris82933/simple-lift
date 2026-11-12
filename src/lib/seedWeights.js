// Starting weights for a new program, so nothing ever opens with an empty
// weight box.
//
// Before this, a ready-made program only got weights for lifts that had a
// progression scheme AND a saved one-rep max. Anyone without saved maxes (every
// new user) started their first workout guessing, double-progression programs
// (Foundations, dumbbell, PPL…) were never filled even when maxes existed, and
// 5/3/1 had no training max at all — so it never produced a working weight.
import { EXERCISE_BY_ID, exMeasure } from '../data/exercises.js'
import { weightForReps, interpolate1RM, incrementForUnits, roundTo } from './oneRepMax.js'
import { trainingMaxFrom } from './fiveThreeOne.js'

// A safely light, equipment-appropriate first weight.
export const LIGHT_DEFAULTS = {
  barbell: { lbs: 45, kg: 20 }, // an empty barbell
  trap_bar: { lbs: 45, kg: 20 },
  dumbbells: { lbs: 10, kg: 5 }, // a light pair, per hand
  kettlebells: { lbs: 15, kg: 8 },
  cable: { lbs: 30, kg: 15 },
  lat_pulldown: { lbs: 40, kg: 20 },
  machines: { lbs: 40, kg: 20 },
  leg_press: { lbs: 90, kg: 40 },
  smith: { lbs: 30, kg: 15 },
  ez_bar: { lbs: 25, kg: 10 },
}

export const BAR_WEIGHT = { lbs: 45, kg: 20 }

const requiresOf = (ex) => ex?.requires || EXERCISE_BY_ID[ex?.id]?.requires || []
export const usesBarbell = (ex) => requiresOf(ex).includes('barbell')

export function lightDefaultWeight(ex, units = 'lbs') {
  for (const gear of requiresOf(ex)) {
    const d = LIGHT_DEFAULTS[gear]
    if (d) return d[units] ?? d.lbs
  }
  return units === 'kg' ? 5 : 10 // unknown/misc gear — still err light, never blank
}

// A saved 1RM for this lift, or one estimated from other saved lifts.
export function oneRMFor(id, maxes = {}) {
  return Number(maxes?.[id]?.oneRM) || interpolate1RM(id, maxes) || 0
}

// With no numbers at all, the lightest training max whose lightest working set
// (65% in week 1) is still at least the empty bar.
export function lightTrainingMax(units = 'lbs') {
  const inc = incrementForUnits(units)
  return Math.ceil(BAR_WEIGHT[units] / 0.65 / inc) * inc
}

const blank = (v) => v === '' || v == null || !(Number(v) > 0)

// One exercise. Only fills what is blank — a weight already set is kept.
export function seedExerciseWeight(ex, { maxes = {}, units = 'lbs' } = {}) {
  if (!ex || ex.load === false) return ex
  const inc = incrementForUnits(units)
  const p = ex.progression
  const oneRM = oneRMFor(ex.id, maxes)
  const bar = usesBarbell(ex) ? BAR_WEIGHT[units] : 0

  if (p?.scheme === '531') {
    if (!blank(p.tm)) return ex
    const tm = Math.max(oneRM ? trainingMaxFrom(oneRM, units) : 0, lightTrainingMax(units))
    return { ...ex, progression: { ...p, tm } }
  }

  const measure = exMeasure(ex)
  const reps = measure.type === 'reps' ? Number(ex.repHigh) || Number(ex.repLow) || 5 : 0
  let w = oneRM && reps ? weightForReps(oneRM, reps, inc) : lightDefaultWeight(ex, units)
  // Linear progressions add weight every session — start just under the
  // true rep max, so the first few weeks are a run-up, not a grind.
  if (oneRM && reps && (p?.scheme === 'lp' || p?.scheme === 'gslp')) w = roundTo(w * 0.9, inc)
  w = Math.max(w, bar)

  const out = { ...ex }
  if (blank(ex.startWeight)) out.startWeight = w
  // The workout reads progression.weight first, then startWeight.
  if (p && 'weight' in p && blank(p.weight)) out.progression = { ...p, weight: blank(ex.startWeight) ? w : Number(ex.startWeight) }
  return out
}

export function seedProgramWeights(program, opts = {}) {
  if (!program?.days) return program
  return {
    ...program,
    days: program.days.map((d) => ({ ...d, exercises: (d.exercises || []).map((e) => seedExerciseWeight(e, opts)) })),
  }
}

// The lifts worth asking about before a program starts: loaded, rep-based
// compound lifts, once each. 5/3/1 main lifts first — those can't be guessed.
export function liftsToAsk(program) {
  const seen = new Map()
  for (const d of program?.days || []) {
    for (const e of d.exercises || []) {
      if (e.load === false) continue
      if (exMeasure(e).type !== 'reps') continue
      const main = e.progression?.scheme === '531'
      // The same lift can appear twice (5/3/1 Boring But Big does bench as the
      // main lift one day and as 5×10 volume another) — main wins.
      if (seen.has(e.id)) { if (main) seen.get(e.id).needsTm = true; continue }
      if (!main && !e.compound) continue
      seen.set(e.id, { id: e.id, name: e.name, needsTm: main, barbell: usesBarbell(e) })
    }
  }
  return [...seen.values()].sort((a, b) => Number(b.needsTm) - Number(a.needsTm))
}
