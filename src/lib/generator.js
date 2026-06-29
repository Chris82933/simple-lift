import { EXERCISES } from '../data/exercises.js'
import { schemeForGoals, prescriptionFor } from '../data/schemes.js'

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

function availableFor(equipment) {
  const have = new Set(equipment)
  return EXERCISES.filter((e) => e.requires.every((r) => have.has(r)))
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
  } = profile

  const scheme = schemeForGoals(goals)
  const pool = availableFor(equipment)
  const ctx = {
    pool,
    scheme,
    focus: new Set(focusAreas),
    goals: new Set(goals),
    trainOthers,
    slots: slotsForLength(sessionLength),
    usage: new Map(),
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
    meta: { daysPerWeek, sessionLength, goals, focusAreas, trainOthers },
    scheme,
    days,
  }
}

export { WEEKDAY_LABELS }
