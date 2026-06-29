// Analyzes a finished session and splits the outcome into:
//  • persist  — applied immediately (carry entered weights forward, GZCLP deloads)
//  • autoNotes — informational messages for deloads that were auto-applied
//  • suggestions — *optional* increases the user confirms at the end, defaulted
//    to weight vs reps based on the program's goals.
import { schemeOf, evaluateProgression, applyStage } from './gzclp.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'

const GOAL_PREF = {
  strength: 'weight', general: 'weight', climbing: 'weight',
  size: 'reps', endurance: 'reps', running: 'reps',
}

export function goalDefault(goals = []) {
  const prefs = goals.map((g) => GOAL_PREF[g] || 'weight')
  if (prefs.length === 0) return 'weight'
  const reps = prefs.filter((p) => p === 'reps').length
  return reps > prefs.length / 2 ? 'reps' : 'weight'
}

const INC = { lbs: { big: 10, small: 5 }, kg: { big: 5, small: 2.5 } }
const isLower = (ex) =>
  ex.regions?.includes('legs') && ['squat', 'hinge', 'lunge'].includes(ex.pattern)
const weightInc = (ex, units) => (INC[units] || INC.lbs)[isLower(ex) ? 'big' : 'small']

const maxEntered = (logged) => Math.max(0, ...logged.map((s) => Number(s.weight) || 0))

export function reviewSession(session, setsMap, goals, units) {
  const persist = []      // { exId, ...fields to write now }
  const autoNotes = []    // strings (deloads already applied)
  const suggestions = []  // confirmable increases
  const def = goalDefault(goals)

  for (const ex of session.exercises) {
    const logged = setsMap[ex.id] || []
    const tracksLoad = ex.load !== false
    const entered = maxEntered(logged)
    const doneSets = logged.filter((s) => s.done && Number(s.reps) > 0)
    const target = ex.repHigh
    const completedAll = doneSets.length >= ex.sets && doneSets.every((s) => Number(s.reps) >= target)

    // Always carry the entered working weight forward (fixes blank-prefill).
    const base = { exId: ex.id }
    if (tracksLoad && entered > 0) base.startWeight = entered

    const scheme = schemeOf(ex)

    // Nothing ticked → incomplete. Keep everything as-is, just remember the
    // weight for next time (no progression, no deload, no suggestion).
    if (doneSets.length === 0) {
      if (scheme && entered > 0) base.progression = { ...ex.progression, weight: entered }
      persist.push(base)
      continue
    }

    // --- GZCLP-scheme exercises ---
    if (scheme) {
      const result = evaluateProgression(ex, logged, units)
      if (result.kind === 'increase') {
        // Keep current weight now; offer the bump as a confirmable suggestion.
        base.progression = { ...ex.progression, weight: entered || ex.progression.weight }
        persist.push(base)
        suggestions.push({
          exId: ex.id, name: ex.name, kind: 'gzclp', goalDefault: 'weight',
          weight: { to: result.progression.weight, inc: result.inc },
          proposed: result.progression,
        })
      } else {
        // deload / hold — apply automatically.
        if (result.kind === 'deload') autoNotes.push(result.message)
        base.progression = result.progression
        persist.push(base)
      }
      continue
    }

    // --- Bodyweight ladder: offer a level-up ---
    if (!tracksLoad && ex.nextId) {
      persist.push(base)
      if (completedAll) {
        const next = EXERCISE_BY_ID[ex.nextId]
        suggestions.push({
          exId: ex.id, name: ex.name, kind: 'levelUp',
          nextId: ex.nextId, nextName: next?.name, goalDefault: 'levelUp',
        })
      }
      continue
    }

    // --- Generic loaded / bodyweight exercises ---
    persist.push(base)
    if (completedAll) {
      const s = { exId: ex.id, name: ex.name, kind: 'generic', goalDefault: tracksLoad ? def : 'reps' }
      if (tracksLoad && entered > 0) {
        const inc = weightInc(ex, units)
        s.weight = { to: entered + inc, inc }
      }
      s.reps = { to: target + 1 }
      // Only surface if there's at least one actionable option.
      if (s.weight || s.reps) suggestions.push(s)
    }
  }

  return { persist, autoNotes, suggestions, goalDefault: def }
}

// Apply the confirmed choices to a fresh program copy. choices: { exId: 'weight'|'reps'|'levelUp'|'keep' }
export function applyChoices(program, dayIndex, suggestions, choices) {
  const exercises = program.days[dayIndex].exercises.map((ex) => {
    const sug = suggestions.find((s) => s.exId === ex.id)
    if (!sug) return ex
    const choice = choices[ex.id]
    if (!choice || choice === 'keep') return ex

    if (choice === 'levelUp' && sug.nextId) {
      const next = EXERCISE_BY_ID[sug.nextId]
      if (!next) return ex
      return {
        ...ex,
        id: next.id, name: next.name, pattern: next.pattern, regions: next.regions,
        compound: next.compound, load: next.load !== false, cues: next.cues,
        ladderId: next.ladderId || null, nextId: next.nextId || null, prevId: next.prevId || null,
        startWeight: '',
      }
    }
    if (choice === 'weight' && sug.weight) {
      if (ex.progression) return applyStage({ ...ex, progression: { ...sug.proposed } })
      return { ...ex, startWeight: sug.weight.to }
    }
    if (choice === 'reps' && sug.reps) {
      return { ...ex, repHigh: sug.reps.to, repLow: Math.max(ex.repLow ?? sug.reps.to, ex.repLow ?? 0) }
    }
    return ex
  })
  return { ...program, days: program.days.map((d, i) => (i === dayIndex ? { ...d, exercises } : d)) }
}
