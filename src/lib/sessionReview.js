// Analyzes a finished session and splits the outcome into:
//  • persist  — applied immediately (carry entered weights forward, GZCLP deloads)
//  • autoNotes — informational messages for deloads that were auto-applied
//  • suggestions — *optional* increases the user confirms at the end. The
//    default is always to keep the weight the same; a lift-appropriate
//    increment is merely flagged as "recommended".
import { schemeOf, evaluateProgression, applyStage } from './gzclp.js'
import { isExtraScheme, evaluateExtra } from './progression.js'
import { EXERCISE_BY_ID, exMeasure } from '../data/exercises.js'

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
    // Warm-up sets are priming only — never count toward progression or logging.
    const logged = (setsMap[ex.id] || []).filter((s) => !s.warmup)
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

    // --- Bodyweight ladder: level up (earned) or ease off (too hard) ---
    if (!tracksLoad && (ex.nextId || ex.prevId)) {
      persist.push(base)
      const bestReps = Math.max(0, ...doneSets.map((s) => Number(s.reps) || 0))
      // Even your best set fell short of the bottom of the range → offer a step down.
      const struggled = doneSets.length > 0 && bestReps < ex.repLow
      if (completedAll && ex.nextId) {
        const next = EXERCISE_BY_ID[ex.nextId]
        suggestions.push({ exId: ex.id, name: ex.name, type: 'levelUp', nextId: ex.nextId, nextName: next?.name })
      } else if (struggled && ex.prevId) {
        const prev = EXERCISE_BY_ID[ex.prevId]
        suggestions.push({ exId: ex.id, name: ex.name, type: 'levelDown', prevId: ex.prevId, prevName: prev?.name })
      } else if (completedAll && !ex.nextId) {
        // Hardest rung — no harder variant, so keep chasing reps.
        suggestions.push({ exId: ex.id, name: ex.name, type: 'reps', reps: { to: target + 1, by: 1 }, hitTop: true, measure: exMeasure(ex) })
      }
      continue
    }

    // --- Generic exercises (progression method drives when/what to suggest) ---
    persist.push(base)
    // Cardio / conditioning is self-paced (go longer or faster when you feel it)
    // — logging it is enough; don't nag to "add a rep" to a treadmill.
    const m = exMeasure(ex)
    if (ex.pattern === 'conditioning' && m.type !== 'reps') continue

    // Linear & RPE progress once you complete the prescribed sets; double
    // progression (and manual) waits until you top the rep range.
    const didSets = doneSets.length >= ex.sets
    const progresses = (method === 'linear' || method === 'rpe') ? didSets : completedAll
    if (progresses) {
      if (tracksLoad && entered > 0) {
        suggestions.push({
          exId: ex.id, name: ex.name, type: 'load',
          base: entered, reps: { to: target + 1, by: 1 }, hitTop: completedAll,
          recommendedInc: recommendedInc(ex, units), isGzclp: false, measure: m,
        })
      } else if (m.type === 'time') {
        // Timed hold (plank, dead hang): grow the duration, not "reps".
        const by = m.unit === 'min' ? 1 : 5
        suggestions.push({ exId: ex.id, name: ex.name, type: 'time', reps: { to: target + by, by }, hitTop: completedAll, measure: m })
      } else {
        suggestions.push({ exId: ex.id, name: ex.name, type: 'reps', reps: { to: target + 1, by: 1 }, hitTop: completedAll, measure: m })
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

    if ((choice === 'levelUp' && sug.nextId) || (choice === 'levelDown' && sug.prevId)) {
      const target = EXERCISE_BY_ID[choice === 'levelUp' ? sug.nextId : sug.prevId]
      if (!target) return ex
      return {
        ...ex,
        id: target.id, name: target.name, pattern: target.pattern, regions: target.regions,
        compound: target.compound, load: target.load !== false, cues: target.cues,
        ladderId: target.ladderId || null, nextId: target.nextId || null, prevId: target.prevId || null,
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
