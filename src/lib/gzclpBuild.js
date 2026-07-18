// Builds a personalised GZCLP program from a few wizard answers — the job the
// Reddit/LiftVault GZCLP spreadsheets do on their "start" tab.
//
// The spreadsheets ask for your maxes and then compute every starting weight for
// you. That's the part Simple Lift was missing: the old template dropped four
// workouts on you with blank weights and left you to guess. This module turns
// answers into a full program with T1/T2/T3 weights already filled in.
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { roundTo, incrementForUnits, estimate1RM } from './oneRepMax.js'

// The four barbell lifts GZCLP rotates. Each is T1 in one workout and T2 in
// another — that pairing is the whole shape of the program.
export const GZCLP_LIFTS = [
  { id: 'back_squat', label: 'Squat', short: 'Squat', big: true },
  { id: 'bench_press', label: 'Bench Press', short: 'Bench', big: false },
  { id: 'deadlift', label: 'Deadlift', short: 'Deadlift', big: true },
  { id: 'overhead_press', label: 'Overhead Press', short: 'OHP', big: false },
]

// T1 starts at ~85% of your 5RM, which works out to roughly 75% of a 1RM — the
// spreadsheet's own recommendation. T2 is the same lift for triple the reps, so
// it starts far lighter; ~60% of 1RM is a 3×10 you can actually finish.
export const T1_PCT = 0.75
export const T2_PCT = 0.60

// How the wizard can learn your numbers.
export const SEED_MODES = [
  { id: 'oneRM', label: 'I know my 1-rep max', hint: 'Enter your best single (or a solid estimate) for each lift.' },
  { id: 'fiveRM', label: 'I know a recent 5-rep set', hint: 'Enter a weight × 5 you did cleanly — we estimate the rest.' },
  { id: 'light', label: 'Start light and build', hint: 'Begin near the bar. Slower, but you will not stall in week two.' },
]

// T3 accessory options, grouped by the slot they fill. The spreadsheets ship a
// "recommended T3 movement" table; this is the same idea, equipment-aware.
export const T3_CHOICES = {
  vert_pull: {
    label: 'Pulling accessory (A-days)',
    ids: ['lat_pulldown', 'cable_pulldown', 'pullup', 'chinup', 'band_pulldown'],
  },
  horiz_pull: {
    label: 'Rowing accessory (B-days)',
    ids: ['db_row', 'barbell_row', 'seated_cable_row', 'inverted_row', 'ring_row'],
  },
}

// An optional fourth movement per workout, for people who want a little more.
// One movement only — GZCLP is already three tiers deep and sessions get long.
// All are rep-measured so the T3 "hit 25 reps → add weight" rule still applies.
export const T3_EXTRAS = [
  { id: 'none', label: 'None', ids: [] },
  { id: 'arms', label: 'Arms', ids: ['db_curl'] },
  { id: 'core', label: 'Core', ids: ['hanging_leg_raise'] },
  { id: 'legs', label: 'Legs & calves', ids: ['bw_calf_raise'] },
]

export const DAY_FORMATS = [
  { id: 3, label: '3 days a week', hint: 'The classic. Four workouts rotate across Mon/Wed/Fri, so each one comes up every ~9 days.' },
  { id: 4, label: '4 days a week', hint: 'Same four workouts, one per training day. Faster progress, more recovery demand.' },
]

// Turn whatever the user typed into an estimated 1RM for a lift.
export function oneRMFrom(mode, value, units) {
  const v = Number(value) || 0
  if (v <= 0) return 0
  if (mode === 'fiveRM') return estimate1RM(v, 5)
  if (mode === 'light') return 0
  return v
}

// Starting weights for a lift's T1 and T2 slots. Returns nulls when we have
// nothing to go on, so the workout screen still asks for a weight.
export function startWeights(oneRM, units) {
  const inc = incrementForUnits(units)
  const bar = units === 'kg' ? 20 : 45
  if (!oneRM) return { t1: null, t2: null }
  return {
    t1: Math.max(bar, roundTo(oneRM * T1_PCT, inc)),
    t2: Math.max(bar, roundTo(oneRM * T2_PCT, inc)),
  }
}

// Pick the first choice the user can actually do with their equipment. `have`
// is a Set of equipment ids; pass null to skip filtering.
export function firstDoable(ids, have) {
  if (!have) return ids[0]
  for (const id of ids) {
    const lib = EXERCISE_BY_ID[id]
    if (lib && (lib.requires || []).every((r) => have.has(r))) return id
  }
  return ids[0]
}

function buildEx(id, sets, reps, rest, extra = {}) {
  const b = EXERCISE_BY_ID[id]
  if (!b) throw new Error(`GZCLP builder references unknown exercise: ${id}`)
  return {
    id: b.id, name: b.name, pattern: b.pattern, regions: b.regions,
    compound: b.compound, load: b.load !== false, cues: b.cues,
    ladderId: b.ladderId || null, nextId: b.nextId || null, prevId: b.prevId || null,
    sets, repLow: reps, repHigh: reps, restSec: rest, startWeight: '',
    ...extra,
  }
}

const tier1 = (id, weight) => buildEx(id, 5, 3, 180, {
  amrap: true, startWeight: weight ?? '',
  progression: { scheme: 't1', stage: 0, weight: weight ?? null },
})
const tier2 = (id, weight) => buildEx(id, 3, 10, 120, {
  startWeight: weight ?? '',
  progression: { scheme: 't2', stage: 0, weight: weight ?? null, stage1Weight: weight ?? null },
})
const tier3 = (id) => buildEx(id, 3, 15, 90, {
  amrap: true, progression: { scheme: 't3', stage: 0, weight: null },
})

// The canonical rotation: each lift is T1 once and T2 once, squat/bench paired
// on A-days and deadlift/OHP on B-days.
const ROTATION = [
  { key: 'A1', t1: 'back_squat', t2: 'bench_press', slot: 'vert_pull' },
  { key: 'B1', t1: 'overhead_press', t2: 'deadlift', slot: 'horiz_pull' },
  { key: 'A2', t1: 'bench_press', t2: 'back_squat', slot: 'vert_pull' },
  { key: 'B2', t1: 'deadlift', t2: 'overhead_press', slot: 'horiz_pull' },
]

const TRAINING_DAYS = { 3: [1, 3, 5], 4: [1, 2, 4, 5] }

/**
 * Build the program.
 * config = {
 *   units, seedMode, maxes: { back_squat: <number>, ... },
 *   dayFormat: 3 | 4,
 *   t3: { vert_pull: <exId>, horiz_pull: <exId> },
 *   extra: 'none' | 'arms' | 'core' | 'legs',
 * }
 */
export function buildGzclpProgram(config) {
  const { units = 'lbs', seedMode = 'oneRM', maxes = {}, dayFormat = 3, t3 = {}, extra = 'none' } = config
  const weights = {}
  for (const lift of GZCLP_LIFTS) {
    const oneRM = oneRMFrom(seedMode, maxes[lift.id], units)
    weights[lift.id] = startWeights(oneRM, units)
  }
  const extraIds = (T3_EXTRAS.find((e) => e.id === extra) || T3_EXTRAS[0]).ids

  const days = ROTATION.map((r) => {
    const accessory = t3[r.slot] || T3_CHOICES[r.slot].ids[0]
    const exercises = [
      tier1(r.t1, weights[r.t1].t1),
      tier2(r.t2, weights[r.t2].t2),
      tier3(accessory),
      ...extraIds.map((id) => tier3(id)),
    ]
    const t1Name = EXERCISE_BY_ID[r.t1].name
    const t2Name = EXERCISE_BY_ID[r.t2].name
    return {
      title: `${r.key} · ${t1Name}`,
      note: `T1 ${t1Name} 5×3+ · T2 ${t2Name} 3×10 · T3 ${EXERCISE_BY_ID[accessory].name} 3×15+`,
      weekday: null,
      dayLabel: `${r.key} · ${t1Name}`,
      regions: [...new Set(exercises.flatMap((e) => e.regions))],
      exercises,
    }
  })

  return {
    name: 'GZCLP',
    templateId: 'gzclp',
    source: 'gzclp-wizard',
    gzclp: { units, seedMode, dayFormat, t3, extra },
    createdAt: new Date().toISOString(),
    goals: ['strength'],
    deloadWeeks: 6,
    deloadNote: 'GZCLP drops stages automatically when you miss, but a planned lighter week every 6 weeks keeps the joints fresh.',
    schedule: { mode: 'rotation', trainingDays: TRAINING_DAYS[dayFormat] || TRAINING_DAYS[3] },
    days,
  }
}

// A compact preview of what the wizard will produce, for the review step.
export function previewRotation(config) {
  const { units = 'lbs', seedMode = 'oneRM', maxes = {} } = config
  return ROTATION.map((r) => {
    const w1 = startWeights(oneRMFrom(seedMode, maxes[r.t1], units), units).t1
    const w2 = startWeights(oneRMFrom(seedMode, maxes[r.t2], units), units).t2
    return {
      key: r.key,
      t1: EXERCISE_BY_ID[r.t1].name,
      t2: EXERCISE_BY_ID[r.t2].name,
      t1Weight: w1,
      t2Weight: w2,
    }
  })
}
