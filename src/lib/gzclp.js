// Authentic GZCLP progression. Exercises carry a `progression` object:
//   { scheme: 't1' | 't2' | 't3', stage: <index>, weight: <number|null> }
// The scheme defines the rep/set stages; weight climbs each success, and on a
// failure you drop to the next (harder-to-complete) stage at the same weight,
// then reset once you fail the final stage.

export const GZCLP_SCHEMES = {
  t1: {
    label: 'T1',
    stages: [{ sets: 5, reps: 3 }, { sets: 6, reps: 2 }, { sets: 10, reps: 1 }],
    amrap: true,        // last set is AMRAP ("+")
    resetFactor: 0.85,  // on final-stage failure, drop to ~85% and restart
  },
  t2: {
    label: 'T2',
    stages: [{ sets: 3, reps: 10 }, { sets: 3, reps: 8 }, { sets: 3, reps: 6 }],
    amrap: false,
    resetFactor: 1,     // restart at 3×10 keeping the weight (you're stronger now)
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
  if (units === 'kg') return isT3 ? 2.5 : isLowerMain(ex) ? 5 : 2.5
  return isT3 ? 5 : isLowerMain(ex) ? 10 : 5
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

  if (success) {
    const inc = increment(ex, units, false)
    return {
      kind: 'increase',
      progression: { ...ex.progression, weight: baseWeight + inc },
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
      progression: { ...ex.progression, stage: ns, weight: baseWeight },
      message: `${ex.name}: missed reps — dropping to Stage ${ns + 1} (${next.sets}×${next.reps}) at ${baseWeight} ${units}.`,
    }
  }

  // Failed the final stage → reset weight and restart at Stage 1 (automatic).
  const reset = roundTo(baseWeight * s.resetFactor, units === 'kg' ? 2.5 : 5)
  return {
    kind: 'deload',
    progression: { ...ex.progression, stage: 0, weight: reset },
    message: `${ex.name}: reset — back to Stage 1 (${s.stages[0].sets}×${s.stages[0].reps}) at ${reset} ${units}.`,
  }
}
