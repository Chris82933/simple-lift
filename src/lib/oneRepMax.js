// One-rep-max estimation and working-weight derivation.
// Estimates come from submaximal sets (safer than a true 1RM attempt).

export const FORMULAS = {
  // Epley: 1RM = w · (1 + reps/30)
  epley: (w, r) => w * (1 + r / 30),
  // Brzycki: 1RM = w · 36/(37 − reps)  (guard reps ≥ 37)
  brzycki: (w, r) => (r >= 37 ? w : (w * 36) / (37 - r)),
}

export const METHODS = [
  { id: 'average', label: 'Average (recommended)' },
  { id: 'epley', label: 'Epley' },
  { id: 'brzycki', label: 'Brzycki' },
]

export const roundTo = (n, inc) => (inc > 0 ? Math.round(n / inc) * inc : Math.round(n))

// Estimate a 1RM from weight × reps (reps already include any reps-in-reserve).
export function estimate1RM(weight, reps, method = 'average') {
  const w = Number(weight)
  const r = Number(reps)
  if (!w || !r || r < 1) return 0
  if (r === 1) return w
  if (method === 'epley') return FORMULAS.epley(w, r)
  if (method === 'brzycki') return FORMULAS.brzycki(w, r)
  return (FORMULAS.epley(w, r) + FORMULAS.brzycki(w, r)) / 2
}

// %1RM → approximate reps you can do at that percentage.
export const PERCENT_TABLE = [
  { pct: 100, reps: 1 },
  { pct: 95, reps: 2 },
  { pct: 92, reps: 3 },
  { pct: 90, reps: 4 },
  { pct: 87, reps: 5 },
  { pct: 85, reps: 6 },
  { pct: 82, reps: 7 },
  { pct: 80, reps: 8 },
  { pct: 77, reps: 9 },
  { pct: 75, reps: 10 },
  { pct: 70, reps: 12 },
  { pct: 67, reps: 15 },
]

export function workingWeights(oneRM, inc = 5) {
  return PERCENT_TABLE.map(({ pct, reps }) => ({
    pct,
    reps,
    weight: roundTo((oneRM * pct) / 100, inc),
  }))
}

// The weight you should be able to lift for a given number of reps.
export function weightForReps(oneRM, reps, inc = 5) {
  if (!oneRM) return 0
  const row = PERCENT_TABLE.reduce((best, r) =>
    Math.abs(r.reps - reps) < Math.abs(best.reps - reps) ? r : best,
  )
  return roundTo((oneRM * row.pct) / 100, inc)
}

// Goal-oriented working-set guidance off an estimated 1RM.
export const GOAL_TARGETS = [
  { goal: 'Strength', reps: '3–5', pct: 87 },
  { goal: 'Muscle (hypertrophy)', reps: '8–12', pct: 75 },
  { goal: 'Endurance', reps: '15+', pct: 65 },
  { goal: 'Power / speed', reps: '2–3 explosive', pct: 60 },
]

export function goalWorkingSets(oneRM, inc = 5) {
  return GOAL_TARGETS.map((g) => ({ ...g, weight: roundTo((oneRM * g.pct) / 100, inc) }))
}

export const incrementForUnits = (units) => (units === 'kg' ? 2.5 : 5)

// Standard warm-up ramp (r/Fitness / StrongLifts style): a few progressively
// heavier sets leading into your working weight — lighter with more reps,
// building to heavy with fewer, so the working sets feel primed, not cold.
// Working sets stay at one weight; the ramp is the warm-up, not the work.
export const WARMUP_SCHEME = [
  { pct: 0.4, reps: 5 },
  { pct: 0.6, reps: 3 },
  { pct: 0.8, reps: 2 },
]

// Build warm-up rows for a given working weight (drops any that meet/exceed it).
export function warmupSets(workingWeight, inc = 5) {
  const w = Number(workingWeight)
  if (!w) return []
  return WARMUP_SCHEME
    .map(({ pct, reps }) => ({ weight: roundTo(w * pct, inc), reps }))
    .filter((s) => s.weight > 0 && s.weight < w)
}

// Typical 1RM ratios relative to the back squat, for estimating an untested
// barbell lift's strength from ones you've already recorded. These are rough
// population averages — a sensible starting point the user then refines, not
// a promise. Only well-established barbell lifts are listed; anything not here
// can't be interpolated (returns null).
export const STRENGTH_RATIOS = {
  back_squat: 1,
  front_squat: 0.85,
  deadlift: 1.2,
  romanian_dl: 0.9,
  good_morning: 0.5,
  hip_thrust: 1.35,
  bench_press: 0.75,
  overhead_press: 0.45,
  barbell_row: 0.65,
}

// Estimate a lift's 1RM from any saved maxes, via the ratio table. Converts each
// convertible record to a "squat-equivalent" 1RM, averages them, then scales to
// the target lift. Returns null when nothing can be converted.
export function interpolate1RM(exId, maxes) {
  const targetRatio = STRENGTH_RATIOS[exId]
  if (!targetRatio) return null
  const equivs = []
  for (const [id, m] of Object.entries(maxes || {})) {
    if (id === exId) continue
    const r = STRENGTH_RATIOS[id]
    const oneRM = Number(m?.oneRM)
    if (!r || !oneRM) continue
    equivs.push(oneRM / r)
  }
  if (equivs.length === 0) return null
  const squatEquiv = equivs.reduce((a, b) => a + b, 0) / equivs.length
  return squatEquiv * targetRatio
}
