import { lastPerformance } from './storage.js'

// Smallest sensible jump per unit / movement size.
const INCREMENT = {
  lbs: { big: 10, small: 5 },
  kg: { big: 5, small: 2.5 },
}

const isLowerBody = (exercise) =>
  exercise.regions.includes('legs') &&
  ['squat', 'hinge', 'lunge'].includes(exercise.pattern)

/**
 * Suggests a starting load (and a short reason) for an exercise this session,
 * based on the last time it was performed.
 *
 * Returns { suggestedWeight, lastWeight, reason, progressed } or null when the
 * exercise isn't load-tracked or has no history yet.
 */
export function suggestLoad(exercise, prescription, units = 'lbs') {
  if (exercise.load === false) return null

  const last = lastPerformance(exercise.id)
  if (!last) {
    return { suggestedWeight: '', lastWeight: null, reason: 'First time — pick a weight you can control for all sets.', progressed: false }
  }

  const completed = last.sets.filter((s) => s.done && Number(s.reps) > 0)
  if (completed.length === 0) {
    return { suggestedWeight: '', lastWeight: null, reason: 'Log your working weight to start tracking progress.', progressed: false }
  }

  const lastWeight = Math.max(...completed.map((s) => Number(s.weight) || 0))
  const hitTopReps =
    completed.length >= prescription.sets &&
    completed.every((s) => Number(s.reps) >= prescription.repHigh)

  const inc = INCREMENT[units] || INCREMENT.lbs
  if (hitTopReps && lastWeight > 0) {
    const bump = isLowerBody(exercise) ? inc.big : inc.small
    return {
      suggestedWeight: lastWeight + bump,
      lastWeight,
      reason: `You hit the top of the rep range last time — add ${bump} ${units}.`,
      progressed: true,
    }
  }

  return {
    suggestedWeight: lastWeight,
    lastWeight,
    reason: `Last time: ${lastWeight} ${units}. Aim to add reps before adding weight.`,
    progressed: false,
  }
}
