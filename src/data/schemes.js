// Maps training goals to set/rep/rest prescriptions. When multiple goals are
// chosen, the prescriptions are blended (sets & reps averaged, rest maxed).

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

// Prescription for a single exercise given the blended scheme.
export function prescriptionFor(exercise, scheme) {
  const tier = exercise.compound ? scheme.compound : scheme.accessory
  return {
    sets: tier.sets,
    repLow: tier.repLow,
    repHigh: tier.repHigh,
    restSec: tier.rest,
  }
}

export const repsLabel = (p) =>
  p.repLow === p.repHigh ? `${p.repLow}` : `${p.repLow}–${p.repHigh}`
