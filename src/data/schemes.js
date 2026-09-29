// Maps training goals to set/rep/rest prescriptions. When multiple goals are
// chosen, the prescriptions are blended (sets & reps averaged, rest maxed).
import { exMeasure, EXERCISE_BY_ID } from './exercises.js'

const GOAL_SCHEMES = {
  general: { compound: { sets: 4, repLow: 6, repHigh: 8, rest: 120 }, accessory: { sets: 3, repLow: 10, repHigh: 12, rest: 75 } },
  strength: { compound: { sets: 5, repLow: 4, repHigh: 6, rest: 180 }, accessory: { sets: 3, repLow: 6, repHigh: 8, rest: 120 } },
  size: { compound: { sets: 4, repLow: 8, repHigh: 10, rest: 90 }, accessory: { sets: 3, repLow: 12, repHigh: 15, rest: 60 } },
  endurance: { compound: { sets: 3, repLow: 15, repHigh: 20, rest: 45 }, accessory: { sets: 3, repLow: 15, repHigh: 20, rest: 45 } },
  climbing: { compound: { sets: 4, repLow: 5, repHigh: 8, rest: 150 }, accessory: { sets: 3, repLow: 8, repHigh: 12, rest: 90 } },
  running: { compound: { sets: 3, repLow: 8, repHigh: 12, rest: 90 }, accessory: { sets: 2, repLow: 12, repHigh: 15, rest: 60 } },
}

const avg = (nums) => Math.round(nums.reduce((a, b) => a + b, 0) / nums.length)
const max = (nums) => Math.max(...nums)

function blend(tier, goals) {
  const picks = goals.map((g) => GOAL_SCHEMES[g]?.[tier]).filter(Boolean)
  if (picks.length === 0) picks.push(GOAL_SCHEMES.general[tier])
  return {
    sets: avg(picks.map((p) => p.sets)),
    repLow: avg(picks.map((p) => p.repLow)),
    repHigh: avg(picks.map((p) => p.repHigh)),
    rest: max(picks.map((p) => p.rest)),
  }
}

export function schemeForGoals(goals = []) {
  return {
    compound: blend('compound', goals),
    accessory: blend('accessory', goals),
  }
}

// Popular programs don't prescribe one blanket rep range — they train small
// muscles and endurance-y patterns with higher reps and short rest, and reserve
// the low-rep, long-rest work for the big compounds. These per-pattern styles
// layer on top of the goal scheme so a lateral raise defaults to 12–20 and a
// squat to heavy 5s, matching how PPL / PHUL / 5-3-1 accessory work is written.
const PATTERN_STYLE = {
  calf: { sets: 4, repLow: 12, repHigh: 20, rest: 45 },
  core: { sets: 3, repLow: 12, repHigh: 20, rest: 45 },
  shoulder_iso: { sets: 3, repLow: 12, repHigh: 20, rest: 60 },
  biceps: { sets: 3, repLow: 10, repHigh: 15, rest: 60 },
  triceps: { sets: 3, repLow: 10, repHigh: 15, rest: 60 },
}

// Small hip/glute isolation: trained for reps and a burn, not for heavy singles.
// Keyed by exercise rather than by pattern because these share `hinge` with the
// deadlift, which very much does want the low-rep, long-rest treatment.
const EXERCISE_STYLE = {
  hip_abduction: { sets: 3, repLow: 12, repHigh: 20, rest: 45 },
  hip_adduction: { sets: 3, repLow: 12, repHigh: 20, rest: 45 },
  cable_kickback: { sets: 3, repLow: 12, repHigh: 20, rest: 45 },
}

// Prescription for a single exercise given the blended scheme. Adapts to how the
// exercise is measured (reps / timed hold / cardio) and to the muscle worked, so
// the starting point makes sense before the user tweaks anything.
export function prescriptionFor(exercise, scheme) {
  const m = exMeasure(exercise)
  // A run / bike / row block: one working set, prescribed in minutes.
  if (m.type === 'distance') return { sets: 1, repLow: 2, repHigh: 5, restSec: 60 }
  if (m.type === 'time') {
    if (m.unit === 'min') return { sets: 1, repLow: 10, repHigh: 20, restSec: 60 } // timed cardio block
    // Timed hold — use the exercise's own natural hold range when it declares
    // one (short for a front lever, longer for a plank), else a plank default.
    const [lo, hi] = (EXERCISE_BY_ID[exercise.id] || exercise).holdSec || [20, 45]
    return { sets: 3, repLow: lo, repHigh: hi, restSec: 60 }
  }
  // Per-exercise style beats the pattern's. A few moves carry a pattern for the
  // generator's benefit (hip abduction is hinge-ish posterior work, so it fills
  // an accessory slot on a leg day) while being trained nothing like the rest of
  // that pattern. The hinge accessory default is 6-8 reps at two minutes' rest,
  // which is a squat's prescription applied to a glute-medius machine.
  const style = EXERCISE_STYLE[exercise.id] || PATTERN_STYLE[exercise.pattern]
  if (style) return { sets: style.sets, repLow: style.repLow, repHigh: style.repHigh, restSec: style.rest }
  const tier = exercise.compound ? scheme.compound : scheme.accessory
  return { sets: tier.sets, repLow: tier.repLow, repHigh: tier.repHigh, restSec: tier.rest }
}

export const repsLabel = (p) =>
  p.repLow === p.repHigh ? `${p.repLow}` : `${p.repLow}–${p.repHigh}`
