// Progression schemes beyond GZCLP, learned from popular barbell programs:
//
//  • lp   — Classic Linear Progression (StrongLifts 5×5, Starting Strength):
//           add a fixed jump every session you complete all sets × reps. Miss
//           the same lift 3 sessions in a row → auto-deload 10% and climb back.
//
//  • gslp — Greyskull LP: the last set is AMRAP. Hit the target reps → add
//           weight; blow past it (≥ 2× target) → earn a double jump. Miss the
//           target → reset 10% immediately.
//
// Like GZCLP, *increases are opt-in suggestions* (the user confirms them at the
// end of a session) while *deloads auto-apply*. All state — the working weight
// and the miss streak — lives on the exercise's `progression` object, so it
// travels with the program through export/import with zero extra plumbing.

export const EXTRA_SCHEMES = {
  lp: { label: 'Linear progression' },
  gslp: { label: 'Greyskull AMRAP LP' },
}

export const isExtraScheme = (name) => name === 'lp' || name === 'gslp'

export const FAIL_LIMIT = 3

const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step)
const deloadStep = (units) => (units === 'kg' ? 2.5 : 5)
const isLowerMain = (ex) => ex.regions?.includes('legs') && ['squat', 'hinge'].includes(ex.pattern)

// Per-session jump. LP uses the big classic jumps; GSLP uses smaller ones (with
// a double jump available on a big AMRAP set).
export function schemeIncrement(ex, units, scheme) {
  if (scheme === 'gslp') {
    if (units === 'kg') return isLowerMain(ex) ? 2.5 : 1.25
    return isLowerMain(ex) ? 5 : 2.5
  }
  // lp
  if (units === 'kg') return isLowerMain(ex) ? 5 : 2.5
  return isLowerMain(ex) ? 10 : 5
}

const maxLogged = (sets) => Math.max(0, ...sets.map((s) => Number(s.weight) || 0))

/**
 * Evaluate an lp/gslp exercise after a session.
 * @returns { kind:'increase'|'deload'|'hold', progression, suggestion?, autoNote? }
 *   - increase → `suggestion` holds the recommended jump (opt-in for the user)
 *   - deload   → already baked into `progression`; `autoNote` explains it
 */
export function evaluateExtra(ex, loggedSets, units = 'lbs') {
  const scheme = ex.progression.scheme
  const entered = maxLogged(loggedSets) || ex.progression.weight || 0
  const done = loggedSets.filter((s) => s.done && Number(s.reps) > 0)
  const target = ex.repHigh

  // Nothing logged, or no weight entered yet → just remember the weight.
  if (done.length === 0 || entered === 0) {
    return { kind: 'hold', progression: { ...ex.progression, weight: entered || ex.progression.weight } }
  }

  if (scheme === 'gslp') {
    const lastReps = Number(loggedSets[loggedSets.length - 1]?.reps) || 0
    const priorDone = done.length >= ex.sets - 1 // all non-AMRAP sets completed
    if (lastReps >= target && priorDone) {
      const inc = schemeIncrement(ex, units, 'gslp')
      const dbl = lastReps >= target * 2
      return {
        kind: 'increase',
        progression: { ...ex.progression, weight: entered, fails: 0 },
        suggestion: { base: entered, recommendedInc: dbl ? inc * 2 : inc, doubleJump: dbl },
      }
    }
    const reset = roundTo(entered * 0.9, deloadStep(units))
    return {
      kind: 'deload',
      progression: { ...ex.progression, weight: reset, fails: 0 },
      autoNote: `${ex.name}: missed ${target} on the AMRAP set — reset to ${reset} ${units} (−10%).`,
    }
  }

  // lp
  const success = done.length >= ex.sets && done.every((s) => Number(s.reps) >= target)
  if (success) {
    return {
      kind: 'increase',
      progression: { ...ex.progression, weight: entered, fails: 0 },
      suggestion: { base: entered, recommendedInc: schemeIncrement(ex, units, 'lp') },
    }
  }
  const fails = (ex.progression.fails || 0) + 1
  if (fails >= FAIL_LIMIT) {
    const reset = roundTo(entered * 0.9, deloadStep(units))
    return {
      kind: 'deload',
      progression: { ...ex.progression, weight: reset, fails: 0 },
      autoNote: `${ex.name}: missed ${FAIL_LIMIT} sessions in a row — deload to ${reset} ${units} (−10%) and build back up.`,
    }
  }
  return {
    kind: 'hold',
    progression: { ...ex.progression, weight: entered, fails },
    autoNote: `${ex.name}: missed ${ex.sets}×${target} (strike ${fails}/${FAIL_LIMIT}) — repeat ${entered} ${units} next time.`,
  }
}

// One-line guidance for the workout screen.
export function extraNote(ex, units = 'lbs') {
  const scheme = ex.progression?.scheme
  const w = ex.progression?.weight
  const wTxt = w != null && w !== '' ? `${w} ${units}` : 'pick a starting weight'
  if (scheme === 'gslp') {
    return `Greyskull LP · ${ex.sets}×${ex.repHigh}, last set AMRAP at ${wTxt}. Hit ${ex.repHigh}+ to add weight; ${ex.repHigh * 2}+ earns a double jump.`
  }
  if (scheme === 'lp') {
    const fails = ex.progression?.fails || 0
    const streak = fails ? ` · ${fails}/${FAIL_LIMIT} misses` : ''
    return `Linear progression · ${ex.sets}×${ex.repHigh} at ${wTxt}. Add weight every session you hit all reps${streak}.`
  }
  return null
}
