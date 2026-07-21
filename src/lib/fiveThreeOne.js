// Jim Wendler's 5/3/1 — the standard answer to "linear progression stopped
// working, what now". Unlike every other program in the app, it is percentage
// based and runs on a four-week wave, so it needs its own engine.
//
// Everything keys off a TRAINING MAX (TM), deliberately set to ~90% of a true
// 1RM. Working weights are percentages of the TM, so the bar stays manageable
// and progress comes from beating rep targets rather than from grinding singles.
//
// Exercises carry:
//   { scheme: '531', week: 0..3, tm: <number>, cycle: <number> }

// Week 1 "5s", week 2 "3s", week 3 "5/3/1", week 4 deload.
export const WEEKS = [
  { name: '5s', pcts: [0.65, 0.75, 0.85], reps: [5, 5, 5], amrap: true },
  { name: '3s', pcts: [0.70, 0.80, 0.90], reps: [3, 3, 3], amrap: true },
  { name: '5/3/1', pcts: [0.75, 0.85, 0.95], reps: [5, 3, 1], amrap: true },
  { name: 'Deload', pcts: [0.40, 0.50, 0.60], reps: [5, 5, 5], amrap: false },
]

// Wendler's own increments after each completed cycle.
const TM_STEP = {
  lbs: { upper: 5, lower: 10 },
  kg: { upper: 2.5, lower: 5 },
}

const isLower = (ex) =>
  (ex.regions || []).includes('legs') && ['squat', 'hinge'].includes(ex.pattern)

export const is531 = (ex) => ex?.progression?.scheme === '531'

const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step)

// A true 1RM is not the training max — 5/3/1 runs at 90% of it on purpose.
export const trainingMaxFrom = (oneRM, units = 'lbs') =>
  oneRM > 0 ? roundTo(oneRM * 0.9, units === 'kg' ? 2.5 : 5) : null

/** The three working sets for an exercise's current week. */
export function weekSets(ex, units = 'lbs') {
  const w = WEEKS[ex?.progression?.week ?? 0] || WEEKS[0]
  const tm = Number(ex?.progression?.tm) || 0
  const step = units === 'kg' ? 2.5 : 5
  return w.pcts.map((pct, i) => ({
    weight: tm > 0 ? roundTo(tm * pct, step) : null,
    reps: w.reps[i],
    pct,
    // Only the final set is "as many reps as possible", and never on a deload.
    amrap: w.amrap && i === w.pcts.length - 1,
  }))
}

/** Render the exercise for its current week: 3 sets, per-set weights. */
export function applyWeek(ex, units = 'lbs') {
  if (!is531(ex)) return ex
  const w = WEEKS[ex.progression.week ?? 0] || WEEKS[0]
  const rows = weekSets(ex, units)
  return {
    ...ex,
    sets: rows.length,
    repLow: Math.min(...w.reps),
    repHigh: Math.max(...w.reps),
    amrap: w.amrap,
    // Per-set prescriptions — the workout screen prefills each set separately,
    // since 5/3/1's three sets are deliberately different weights.
    setWeights: rows.map((r) => r.weight),
    setReps: rows.map((r) => r.reps),
    startWeight: rows[rows.length - 1].weight ?? '',
  }
}

/** Note for the workout screen describing this week's prescription. */
export function weekNote(ex, units = 'lbs') {
  if (!is531(ex)) return null
  const w = WEEKS[ex.progression.week ?? 0] || WEEKS[0]
  const tm = Number(ex.progression.tm) || 0
  if (!tm) return `5/3/1 · ${w.name} week — set a training max to get your weights.`
  const rows = weekSets(ex, units)
  const bits = rows.map((r) => `${r.weight} ${units}×${r.reps}${r.amrap ? '+' : ''}`).join(' · ')
  const cycle = (ex.progression.cycle ?? 0) + 1
  return w.name === 'Deload'
    ? `5/3/1 · Deload week (cycle ${cycle}). Easy sets — ${bits}. Do not push these.`
    : `5/3/1 · ${w.name} week (cycle ${cycle}), TM ${tm} ${units}: ${bits}. Last set is AMRAP.`
}

// The rep target for the last set — beating it comfortably is the signal that
// the training max is still honest.
const lastSetTarget = (week) => WEEKS[week]?.reps.slice(-1)[0] ?? 5

/**
 * Advance after a session. Weeks roll 1 → 2 → 3 → deload → next cycle, and the
 * training max goes up once per completed cycle rather than every session.
 * Returns { kind, progression, message } or null when not a 5/3/1 lift.
 */
export function evaluateProgression(ex, loggedSets, units = 'lbs') {
  if (!is531(ex)) return null
  const week = ex.progression.week ?? 0
  const cycle = ex.progression.cycle ?? 0
  const tm = Number(ex.progression.tm) || 0
  const done = (loggedSets || []).filter((s) => s.done && Number(s.reps) > 0)

  if (!tm) {
    return {
      kind: 'hold',
      progression: { ...ex.progression },
      message: `${ex.name}: set a training max (about 90% of your best single) to start the cycle.`,
    }
  }

  const lastReps = Number(done[done.length - 1]?.reps) || 0
  const target = lastSetTarget(week)

  // Weeks 1-3: roll forward and report how the AMRAP went.
  if (week < 3) {
    const next = { ...ex.progression, week: week + 1 }
    const verdict = week === 3 || lastReps === 0
      ? ''
      : lastReps >= target + 3
        ? ` ${lastReps} reps on the last set — well ahead of the ${target} target.`
        : lastReps >= target
          ? ` ${lastReps} reps on the last set, target was ${target}.`
          : ` ${lastReps} reps, short of the ${target} target — keep the training max where it is.`
    return {
      kind: 'hold',
      progression: next,
      message: `${ex.name}: on to the ${WEEKS[week + 1].name} week.${verdict}`,
    }
  }

  // After the deload: bump the training max and start the next cycle. Missing
  // the week-3 target is the cue to repeat rather than climb, but that decision
  // belongs to the lifter, so this only ever advises.
  const stepKind = isLower(ex) ? 'lower' : 'upper'
  const inc = TM_STEP[units === 'kg' ? 'kg' : 'lbs'][stepKind]
  const nextTm = tm + inc
  return {
    kind: 'increase',
    inc,
    progression: { ...ex.progression, week: 0, cycle: cycle + 1, tm: nextTm },
    message: `${ex.name}: cycle ${cycle + 1} done — training max ${tm} → ${nextTm} ${units}.`,
  }
}
