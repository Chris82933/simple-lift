// Authentic GZCLP progression. Exercises carry a `progression` object:
//   { scheme: 't1' | 't2' | 't3', stage: <index>, weight: <number|null> }
// The scheme defines the rep/set stages; weight climbs each success, and on a
// failure you drop to the next (harder-to-complete) stage at the same weight,
// then reset once you fail the final stage.

import { isBarbellLift, smallestBarJump } from './plates.js'

export const GZCLP_SCHEMES = {
  t1: {
    label: 'T1',
    stages: [{ sets: 5, reps: 3 }, { sets: 6, reps: 2 }, { sets: 10, reps: 1 }],
    amrap: true,        // last set is AMRAP ("+")
    resetFactor: 0.9,   // on final-stage failure, cut 10% and restart (per the spreadsheet)
  },
  t2: {
    label: 'T2',
    stages: [{ sets: 3, reps: 10 }, { sets: 3, reps: 8 }, { sets: 3, reps: 6 }],
    amrap: false,
    // Canonical T2 reset: go back to the weight you last *started* Stage 1 with
    // and add a chunk — you're stronger than when you began that run.
    restartBump: { lbs: 15, kg: 7.5 },
  },
  t3: {
    label: 'T3',
    t3: true,
    stages: [{ sets: 3, reps: 15 }],
    amrap: true,
    target: 25,         // hit 25+ on the AMRAP last set → add weight
  },
}

export const schemeOf = (ex) =>
  ex?.progression ? GZCLP_SCHEMES[ex.progression.scheme] : null

const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step)

// Squat & deadlift get the big jump; presses get the small one.
const isLowerMain = (ex) =>
  ex.regions?.includes('legs') && ['squat', 'hinge'].includes(ex.pattern)

function increment(ex, units, isT3) {
  const nominal = units === 'kg'
    ? (isT3 ? 2.5 : isLowerMain(ex) ? 5 : 2.5)
    : (isT3 ? 5 : isLowerMain(ex) ? 10 : 5)
  // Round up to something the user can actually load. Without 2.5 lb plates a
  // 5 lb jump is impossible, so "+5 lb" would be advice they can't follow.
  if (!isBarbellLift(ex)) return nominal
  const jump = smallestBarJump(units)
  if (jump <= 0) return nominal
  return Math.max(nominal, Math.ceil(nominal / jump) * jump)
}

// Return the exercise with its sets/reps set to the current stage.
export function applyStage(ex) {
  const s = schemeOf(ex)
  if (!s) return ex
  const stage = s.stages[ex.progression.stage] || s.stages[0]
  return {
    ...ex,
    sets: stage.sets,
    repLow: stage.reps,
    repHigh: stage.reps,
    amrap: s.amrap,
    restSec: ex.restSec,
    startWeight: ex.progression.weight ?? '',
  }
}

// A short note describing the current tier / stage for the workout screen.
export function stageNote(ex, units = 'lbs') {
  const s = schemeOf(ex)
  if (!s) return null
  const stage = s.stages[ex.progression.stage]
  const w = ex.progression.weight
  const wTxt = w != null ? `${w} ${units}` : 'pick a starting weight'
  if (s.t3) {
    return `${s.label} · ${stage.sets}×${stage.reps}+ at ${wTxt}. Last set AMRAP — hit ${s.target}+ reps to add weight.`
  }
  return `${s.label} · Stage ${ex.progression.stage + 1}: ${stage.sets}×${stage.reps}${s.amrap ? '+ (last set AMRAP)' : ''} at ${wTxt}.`
}

/**
 * Evaluate one GZCLP exercise after a session and return the next progression
 * state plus a human message. loggedSets = [{ weight, reps, done }].
 * Returns { progression, message } or null if not a GZCLP exercise.
 */
export function evaluateProgression(ex, loggedSets, units = 'lbs') {
  const s = schemeOf(ex)
  if (!s) return null
  const stage = s.stages[ex.progression.stage]
  const done = loggedSets.filter((x) => x.done && Number(x.reps) > 0)
  const baseWeight =
    Math.max(0, ...loggedSets.map((x) => Number(x.weight) || 0)) || ex.progression.weight || 0

  // T3: AMRAP target on the last set.
  if (s.t3) {
    const lastReps = Number(loggedSets[loggedSets.length - 1]?.reps) || 0
    if (baseWeight > 0 && lastReps >= s.target) {
      const inc = increment(ex, units, true)
      return {
        kind: 'increase',
        progression: { ...ex.progression, stage: 0, weight: baseWeight + inc },
        inc,
        message: `${ex.name}: ${lastReps} reps on the last set — ready for +${inc} ${units} → ${baseWeight + inc} ${units}.`,
      }
    }
    return {
      kind: 'hold',
      progression: { ...ex.progression, weight: baseWeight || ex.progression.weight },
      message: `${ex.name}: keep ${baseWeight || '—'} ${units}; build the last set toward ${s.target} reps.`,
    }
  }

  // No weight logged yet — just capture it, don't change stage.
  if (baseWeight === 0) {
    return {
      kind: 'hold',
      progression: { ...ex.progression },
      message: `${ex.name}: log your working weight to start progressing.`,
    }
  }

  const success = done.length >= stage.sets && done.every((x) => Number(x.reps) >= stage.reps)
  // Remember the weight used on the most recent Stage 1 session — a T2 reset
  // rebuilds from there rather than from the (lighter) final-stage weight.
  const atStage1 = ex.progression.stage === 0 ? { stage1Weight: baseWeight } : {}

  if (success) {
    const inc = increment(ex, units, false)
    return {
      kind: 'increase',
      progression: { ...ex.progression, ...atStage1, weight: baseWeight + inc },
      inc,
      message: `${ex.name}: completed ${stage.sets}×${stage.reps} — ready for +${inc} ${units} → ${baseWeight + inc} ${units}.`,
    }
  }

  // Failed this stage → drop to the next stage at the same weight (automatic).
  if (ex.progression.stage < s.stages.length - 1) {
    const ns = ex.progression.stage + 1
    const next = s.stages[ns]
    return {
      kind: 'deload',
      progression: { ...ex.progression, ...atStage1, stage: ns, weight: baseWeight },
      message: `${ex.name}: missed reps — dropping to Stage ${ns + 1} (${next.sets}×${next.reps}) at ${baseWeight} ${units}.`,
    }
  }

  // Failed the final stage → restart at Stage 1.
  const step = units === 'kg' ? 2.5 : 5
  let reset
  if (s.restartBump) {
    // T2: back to the weight this Stage 1 run began at, plus the bump.
    const bump = s.restartBump[units === 'kg' ? 'kg' : 'lbs']
    const base = ex.progression.stage1Weight ?? baseWeight
    reset = roundTo(base + bump, step)
  } else {
    // T1: cut ~10% off what you were lifting.
    reset = roundTo(baseWeight * s.resetFactor, step)
  }
  return {
    kind: 'deload',
    progression: { ...ex.progression, stage: 0, weight: reset, stage1Weight: reset },
    message: `${ex.name}: reset — back to Stage 1 (${s.stages[0].sets}×${s.stages[0].reps}) at ${reset} ${units}.`,
  }
}
