import { lastPerformance } from './storage.js'

// Smallest sensible load jump per unit / movement size.
const INCREMENT = {
  lbs: { big: 10, small: 5 },
  kg: { big: 5, small: 2.5 },
}

// Whether a goal progresses primarily by adding load or by adding reps.
const GOAL_STYLE = {
  strength: 'load',
  general: 'load',
  climbing: 'load',
  size: 'reps',
  endurance: 'reps',
  running: 'reps',
}

function styleForGoals(goals = []) {
  if (goals.length === 0) return 'load'
  const loadVotes = goals.filter((g) => (GOAL_STYLE[g] || 'load') === 'load').length
  return loadVotes >= goals.length / 2 ? 'load' : 'reps'
}

const isLowerBody = (exercise) =>
  exercise.regions?.includes('legs') &&
  ['squat', 'hinge', 'lunge'].includes(exercise.pattern)

/**
 * Goal-aware progressive-overload suggestion for an exercise this session,
 * based on the last time it was performed.
 *
 * prescription: { sets, repLow, repHigh }
 * Returns: { kind, suggestedWeight, suggestedReps, reason, progressed } or null
 *   kind: 'first' | 'addWeight' | 'addReps' | 'hold'
 */
export function suggestProgress(exercise, prescription, units = 'lbs', goals = []) {
  const tracksLoad = exercise.load !== false
  const last = lastPerformance(exercise.id)
  const { sets, repLow, repHigh } = prescription
  const style = styleForGoals(goals)

  if (!last) {
    return {
      kind: 'first',
      suggestedWeight: '',
      suggestedReps: repHigh,
      reason: tracksLoad
        ? 'First time — pick a weight you can control for all sets.'
        : 'First time — aim for clean reps and note how it feels.',
      progressed: false,
    }
  }

  const completed = last.sets.filter((s) => s.done && Number(s.reps) > 0)
  if (completed.length === 0) {
    return {
      kind: 'hold',
      suggestedWeight: tracksLoad ? '' : undefined,
      suggestedReps: repHigh,
      reason: 'Log your working sets to start getting suggestions.',
      progressed: false,
    }
  }

  const lastWeight = tracksLoad ? Math.max(...completed.map((s) => Number(s.weight) || 0)) : null
  const lastMinReps = Math.min(...completed.map((s) => Number(s.reps)))
  const allSetsDone = completed.length >= sets
  const hitTopReps = allSetsDone && completed.every((s) => Number(s.reps) >= repHigh)
  const inc = INCREMENT[units] || INCREMENT.lbs

  // Bodyweight / unloaded: progress purely by reps.
  if (!tracksLoad) {
    if (allSetsDone) {
      return {
        kind: 'addReps',
        suggestedReps: lastMinReps + 1,
        reason: `You completed every set — add a rep (aim for ${lastMinReps + 1}).`,
        progressed: true,
      }
    }
    return {
      kind: 'hold',
      suggestedReps: repHigh,
      reason: `Last time you got ${lastMinReps} reps — match or beat it.`,
      progressed: false,
    }
  }

  // Loaded, hit the top of the range: progress per goal style.
  if (hitTopReps && lastWeight > 0) {
    if (style === 'load') {
      const bump = isLowerBody(exercise) ? inc.big : inc.small
      return {
        kind: 'addWeight',
        suggestedWeight: lastWeight + bump,
        suggestedReps: repLow,
        reason: `Hit the top of the rep range — add ${bump} ${units} and start back at ${repLow} reps.`,
        progressed: true,
      }
    }
    return {
      kind: 'addReps',
      suggestedWeight: lastWeight,
      suggestedReps: lastMinReps + 1,
      reason: `Strong set — keep ${lastWeight} ${units} and add a rep (aim for ${lastMinReps + 1}).`,
      progressed: true,
    }
  }

  // Loaded, completed sets but not yet at the top: chase reps first.
  if (allSetsDone) {
    return {
      kind: 'addReps',
      suggestedWeight: lastWeight,
      suggestedReps: Math.min(lastMinReps + 1, repHigh),
      reason: `Keep ${lastWeight} ${units} and add reps toward ${repHigh} before adding weight.`,
      progressed: false,
    }
  }

  // Didn't finish all sets last time: repeat and consolidate.
  return {
    kind: 'hold',
    suggestedWeight: lastWeight,
    suggestedReps: repLow,
    reason: `Repeat ${lastWeight} ${units} and aim to complete all ${sets} sets.`,
    progressed: false,
  }
}
