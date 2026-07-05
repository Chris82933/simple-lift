// Analyzes a finished session and splits the outcome into:
//  • persist  — applied immediately (carry entered weights forward, GZCLP deloads)
//  • autoNotes — informational messages for deloads that were auto-applied
//  • suggestions — *optional* increases the user confirms at the end. The
//    default is always to keep the weight the same; a lift-appropriate
//    increment is merely flagged as "recommended".
import { schemeOf, evaluateProgression, applyStage } from './gzclp.js'
import { isExtraScheme, evaluateExtra } from './progression.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'

// Selectable weight increments per unit (smallest → largest).
export const INCREMENTS = { lbs: [2.5, 5, 10], kg: [1.25, 2.5, 5] }

// The lift-appropriate increment to flag as recommended.
export function recommendedInc(ex, units) {
  const lower = ex.regions?.includes('legs') && ['squat', 'hinge', 'lunge'].includes(ex.pattern)
  const isolation = !ex.compound
  if (units === 'kg') return isolation ? 1.25 : lower ? 5 : 2.5
  return isolation ? 2.5 : lower ? 10 : 5
}

const maxEntered = (logged) => Math.max(0, ...logged.map((s) => Number(s.weight) || 0))

export function reviewSession(session, setsMap, goals, units, method = 'manual') {
  const persist = []
  const autoNotes = []
  const suggestions = []

  for (const ex of session.exercises) {
    const logged = setsMap[ex.id] || []
    const tracksLoad = ex.load !== false
    const entered = maxEntered(logged)
    const doneSets = logged.filter((s) => s.done && Number(s.reps) > 0)
    const target = ex.repHigh
    const completedAll = doneSets.length >= ex.sets && doneSets.every((s) => Number(s.reps) >= target)

    const base = { exId: ex.id }
    if (tracksLoad && entered > 0) base.startWeight = entered

    const scheme = schemeOf(ex)
    const extra = isExtraScheme(ex.progression?.scheme) ? ex.progression.scheme : null

    // Nothing ticked → incomplete: keep everything, just remember the weight.
    if (doneSets.length === 0) {
      if ((scheme || extra) && entered > 0) base.progression = { ...ex.progression, weight: entered }
      persist.push(base)
      continue
    }

    // --- Linear / Greyskull progression (lp, gslp) ---
    if (extra) {
      const result = evaluateExtra(ex, logged, units)
      base.progression = result.progression
      if (tracksLoad && result.progression.weight) base.startWeight = result.progression.weight
      persist.push(base)
      if (result.autoNote) autoNotes.push(result.autoNote)
      if (result.kind === 'increase' && result.suggestion) {
        suggestions.push({
          exId: ex.id, name: ex.name, type: 'load',
          base: result.suggestion.base, reps: null,
          recommendedInc: result.suggestion.recommendedInc,
          doubleJump: !!result.suggestion.doubleJump, isGzclp: false,
        })
      }
      continue
    }

    // --- GZCLP-scheme exercises ---
    if (scheme) {
      const result = evaluateProgression(ex, logged, units)
      if (result.kind === 'increase') {
        const baseWeight = entered || ex.progression.weight
        base.progression = { ...ex.progression, weight: baseWeight }
        persist.push(base)
        suggestions.push({
          exId: ex.id, name: ex.name, type: 'load',
          base: baseWeight, reps: null, // GZCLP progresses by weight, not reps
          recommendedInc: recommendedInc(ex, units), isGzclp: true,
        })
      } else {
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
        suggestions.push({ exId: ex.id, name: ex.name, type: 'levelUp', nextId: ex.nextId, nextName: next?.name })
      }
      continue
    }

    // --- Generic exercises (progression method drives when/what to suggest) ---
    persist.push(base)
    // Linear & RPE progress once you complete the prescribed sets; double
    // progression (and manual) waits until you top the rep range.
    const didSets = doneSets.length >= ex.sets
    const progresses = (method === 'linear' || method === 'rpe') ? didSets : completedAll
    if (progresses) {
      if (tracksLoad && entered > 0) {
        suggestions.push({
          exId: ex.id, name: ex.name, type: 'load',
          base: entered, reps: { to: target + 1 }, hitTop: completedAll,
          recommendedInc: recommendedInc(ex, units), isGzclp: false,
        })
      } else {
        suggestions.push({ exId: ex.id, name: ex.name, type: 'reps', reps: { to: target + 1 }, hitTop: completedAll })
      }
    }
  }

  return { persist, autoNotes, suggestions }
}

// Choice keys: 'keep' | 'reps' | `w${increment}` (e.g. 'w5')
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
    if (choice === 'reps' && sug.reps) {
      return { ...ex, repHigh: sug.reps.to }
    }
    if (choice.startsWith('w')) {
      const inc = parseFloat(choice.slice(1))
      const newWeight = sug.base + inc
      if (ex.progression) {
        // Completing the jump clears any miss streak (lp) and re-stages (GZCLP).
        return applyStage({ ...ex, progression: { ...ex.progression, weight: newWeight, fails: 0 }, startWeight: newWeight })
      }
      return { ...ex, startWeight: newWeight }
    }
    return ex
  })
  return { ...program, days: program.days.map((d, i) => (i === dayIndex ? { ...d, exercises } : d)) }
}
