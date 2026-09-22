import { EXERCISES, exMeasure } from '../data/exercises.js'
import { schemeForGoals, prescriptionFor } from '../data/schemes.js'
import { loadMaxes, loadSettings } from './storage.js'
import { weightForReps, interpolate1RM, incrementForUnits } from './oneRepMax.js'

// ---- Experience level (U3) — drives starting volume, warm-up ramps, and the
// default progression method. Templates already carry a similar `level`
// concept; this is the equivalent knob for a generated program.
export const EXPERIENCE_LEVELS = [
  { id: 'new', label: 'New to lifting', hint: 'Under ~6 months. Lighter volume, no warm-up ramps yet, simple linear progression.' },
  { id: 'some', label: 'Some experience', hint: '6 months to 2 years. Standard volume, double progression.' },
  { id: 'experienced', label: 'Experienced', hint: '2+ years. Fuller volume — you already know your body.' },
]
export const DEFAULT_EXPERIENCE = 'some'

// Trim volume for a brand-new lifter (less junk volume while form is still
// being learned) and add a touch more for an experienced one. Left alone for
// "some experience", which is what the goal-based scheme already targets.
function adjustSchemeForLevel(scheme, level) {
  if (level === 'new') {
    return {
      compound: { ...scheme.compound, sets: Math.max(2, scheme.compound.sets - 1) },
      accessory: { ...scheme.accessory, sets: Math.max(2, scheme.accessory.sets - 1) },
    }
  }
  if (level === 'experienced') {
    return {
      compound: { ...scheme.compound, sets: scheme.compound.sets + 1 },
      accessory: scheme.accessory,
    }
  }
  return scheme
}

const WEEKDAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

// Which weekdays sessions land on, spaced for recovery. (0 = Sunday)
const WEEKDAY_MAP = {
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
}

// Ordered pattern priorities per session archetype. Extra patterns at the end
// act as backfill when equipment limits earlier choices.
const ARCHETYPES = {
  FULL: { kind: 'full', patterns: ['squat', 'horiz_push', 'horiz_pull', 'hinge', 'vert_push', 'vert_pull', 'core', 'lunge', 'calf', 'conditioning'] },
  UPPER: { kind: 'upper', patterns: ['horiz_push', 'horiz_pull', 'vert_push', 'vert_pull', 'biceps', 'triceps', 'shoulder_iso', 'core'] },
  LOWER: { kind: 'lower', patterns: ['squat', 'hinge', 'lunge', 'calf', 'core', 'conditioning'] },
  PUSH: { kind: 'push', patterns: ['horiz_push', 'vert_push', 'horiz_push', 'triceps', 'shoulder_iso', 'core'] },
  PULL: { kind: 'pull', patterns: ['horiz_pull', 'vert_pull', 'horiz_pull', 'biceps', 'core', 'core'] },
  LEGS: { kind: 'legs', patterns: ['squat', 'hinge', 'lunge', 'calf', 'core', 'conditioning'] },
}

// Split layout per training frequency.
function splitFor(days) {
  switch (days) {
    case 2: return [['Full Body A', 'FULL'], ['Full Body B', 'FULL']]
    case 3: return [['Full Body A', 'FULL'], ['Full Body B', 'FULL'], ['Full Body C', 'FULL']]
    case 4: return [['Upper A', 'UPPER'], ['Lower A', 'LOWER'], ['Upper B', 'UPPER'], ['Lower B', 'LOWER']]
    case 5: return [['Upper', 'UPPER'], ['Lower', 'LOWER'], ['Push', 'PUSH'], ['Pull', 'PULL'], ['Legs', 'LEGS']]
    case 6: return [['Push A', 'PUSH'], ['Pull A', 'PULL'], ['Legs A', 'LEGS'], ['Push B', 'PUSH'], ['Pull B', 'PULL'], ['Legs B', 'LEGS']]
    default: return [['Full Body A', 'FULL'], ['Full Body B', 'FULL'], ['Full Body C', 'FULL']]
  }
}

const NOTES = {
  full: 'Hits every major movement in one session — spaced from your other days for recovery.',
  upper: 'Upper-body push & pull — your legs rest today, balancing your lower days.',
  lower: 'Legs & posterior chain — balances your upper-body days.',
  push: 'Pressing focus (chest, shoulders, triceps) — paired against your pull days.',
  pull: 'Pulling focus (back & biceps) — balances your push days.',
  legs: 'Lower-body day — keeps your week balanced around the big leg lifts.',
}

const slotsForLength = (minutes) => Math.min(8, Math.max(3, Math.round(minutes / 12)))

// ---- Starting weights (U1) — a brand-new user has no saved 1RMs, so without
// this every loaded lift generates with a blank weight box and a "–"
// placeholder: a dead end on the very first screen after onboarding. Fall
// back to a safely light, equipment-appropriate default so the program is
// always usable, never blank.
const LIGHT_DEFAULTS = {
  barbell: { lbs: 45, kg: 20 }, // an empty barbell
  dumbbells: { lbs: 10, kg: 5 }, // a light pair, per hand
  kettlebells: { lbs: 15, kg: 8 },
  cable: { lbs: 30, kg: 15 },
  machines: { lbs: 40, kg: 20 },
  leg_press: { lbs: 90, kg: 40 },
}

function lightDefaultWeight(ex, units) {
  for (const gear of ex.requires || []) {
    const d = LIGHT_DEFAULTS[gear]
    if (d) return d[units] ?? d.lbs
  }
  return units === 'kg' ? 5 : 10 // unknown/misc gear — still err light, never blank
}

// Starting weight for a loaded exercise: a saved 1RM (or one interpolated from
// other saved lifts, same method the Builder/1RM tool use) scaled to the
// prescribed rep target; otherwise a light default. "I don't know" in
// onboarding lands here too, since it simply leaves no maxes to find.
function startWeightFor(ex, repHigh, inc, maxes, units) {
  if (ex.load === false) return ''
  const direct = Number(maxes[ex.id]?.oneRM) || 0
  const oneRM = direct || interpolate1RM(ex.id, maxes) || 0
  if (oneRM) return weightForReps(oneRM, repHigh, inc)
  return lightDefaultWeight(ex, units)
}

function availableFor(equipment) {
  const have = new Set(equipment)
  // Ladder-only variants are excluded from auto-generation — they're for
  // templates and manual selection in the builder.
  return EXERCISES.filter((e) => !e.ladderOnly && e.requires.every((r) => have.has(r)))
}

// Pick the best exercise for a pattern, given focus/goals and prior usage.
function pickExercise(pattern, pool, { focus, goals, trainOthers, usage, usedInSession }) {
  const candidates = pool.filter((e) => e.pattern === pattern && !usedInSession.has(e.id))
  if (candidates.length === 0) return null

  const scored = candidates.map((e) => {
    const hitsFocus = e.regions.some((r) => focus.has(r))
    const hitsGoal = (e.tags || []).some((t) => goals.has(t))
    let score = 0
    if (hitsFocus) score += 3
    if (e.compound) score += 1.5
    if (hitsGoal) score += 1
    if (!trainOthers && !hitsFocus) score -= 5 // concentrate on focus areas
    score -= (usage.get(e.id) || 0) * 2 // spread variety across the week
    return { e, score }
  })

  scored.sort((a, b) => b.score - a.score)
  return scored[0].e
}

function buildSession([title, archetypeKey], ctx) {
  const archetype = ARCHETYPES[archetypeKey]
  const usedInSession = new Set()
  const chosen = []

  for (const pattern of archetype.patterns) {
    if (chosen.length >= ctx.slots) break
    const ex = pickExercise(pattern, ctx.pool, { ...ctx, usedInSession })
    if (!ex) continue
    usedInSession.add(ex.id)
    ctx.usage.set(ex.id, (ctx.usage.get(ex.id) || 0) + 1)
    chosen.push(ex)
  }

  // Backfill if equipment limited the count: any unused available exercise.
  if (chosen.length < ctx.slots) {
    const extras = ctx.pool
      .filter((e) => !usedInSession.has(e.id))
      .sort((a, b) => (ctx.usage.get(a.id) || 0) - (ctx.usage.get(b.id) || 0))
    for (const ex of extras) {
      if (chosen.length >= ctx.slots) break
      usedInSession.add(ex.id)
      ctx.usage.set(ex.id, (ctx.usage.get(ex.id) || 0) + 1)
      chosen.push(ex)
    }
  }

  const exercises = chosen.map((e) => {
    const p = prescriptionFor(e, ctx.scheme)
    // Warm-up ramps only make sense once there's real weight to ramp into —
    // skip them for a brand-new lifter starting at/near an empty bar (U3).
    const measure = exMeasure(e)
    const warmups = e.load !== false && e.compound && measure.type === 'reps' && ctx.experienceLevel !== 'new'
    return {
      id: e.id,
      name: e.name,
      pattern: e.pattern,
      regions: e.regions,
      compound: e.compound,
      load: e.load !== false,
      cues: e.cues,
      sets: p.sets,
      repLow: p.repLow,
      repHigh: p.repHigh,
      restSec: p.restSec,
      startWeight: startWeightFor(e, p.repHigh, ctx.inc, ctx.maxes, ctx.units),
      ...(warmups ? { warmups: true } : {}),
    }
  })

  const regions = [...new Set(chosen.flatMap((e) => e.regions))]
  return { title, kind: archetype.kind, note: NOTES[archetype.kind], regions, exercises }
}

export function generateProgram(profile) {
  const {
    focusAreas = [],
    trainOthers = true,
    equipment = [],
    daysPerWeek = 3,
    sessionLength = 45,
    goals = [],
    experienceLevel = DEFAULT_EXPERIENCE,
  } = profile

  const units = loadSettings().units === 'kg' ? 'kg' : 'lbs'
  const scheme = adjustSchemeForLevel(schemeForGoals(goals), experienceLevel)
  const pool = availableFor(equipment)
  const ctx = {
    pool,
    scheme,
    focus: new Set(focusAreas),
    goals: new Set(goals),
    trainOthers,
    slots: slotsForLength(sessionLength),
    usage: new Map(),
    experienceLevel,
    units,
    inc: incrementForUnits(units),
    maxes: loadMaxes(),
  }

  const split = splitFor(daysPerWeek)
  const weekdays = WEEKDAY_MAP[daysPerWeek] || WEEKDAY_MAP[3]

  const days = split.map((entry, i) => {
    const session = buildSession(entry, ctx)
    const weekday = weekdays[i]
    return { weekday, dayLabel: WEEKDAY_LABELS[weekday], ...session }
  })

  return {
    name: `${daysPerWeek}-Day Plan`,
    source: 'generated',
    goals, // used by progressive-overload suggestions
    createdAt: new Date().toISOString(),
    meta: { daysPerWeek, sessionLength, goals, focusAreas, trainOthers, experienceLevel },
    scheme,
    days,
  }
}

export { WEEKDAY_LABELS }
