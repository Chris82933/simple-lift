// Per-muscle usage intensity for a finished session, for the end-of-workout
// heatmap. Each completed working set credits its primary muscles fully and its
// secondary muscles at half; scores are normalized to the hardest-hit muscle
// (0–1). Set count — not load — so bodyweight and timed work count too.
//
// It's a deliberately simple proxy for "what did I emphasize today", built on
// the same pattern-based muscle data as the exercise icons (see musclesFor).
import { musclesFor } from '../data/exercises.js'

const SECONDARY_WEIGHT = 0.5

// Add an exercise's `weight` (its set count) to its muscles, primary full,
// secondary halved.
function credit(score, ex, weight) {
  if (!weight) return
  const { primary, secondary } = musclesFor(ex)
  for (const m of primary) score[m] = (score[m] || 0) + weight
  for (const m of secondary) score[m] = (score[m] || 0) + weight * SECONDARY_WEIGHT
}

// Normalize raw scores to the hardest-hit muscle (0–1); {} when nothing scored.
function normalize(score) {
  const max = Math.max(0, ...Object.values(score))
  if (max <= 0) return {}
  const heat = {}
  for (const [m, v] of Object.entries(score)) heat[m] = v / max
  return heat
}

// A FINISHED session: weight each exercise by its completed working sets.
export function sessionMuscleHeat(entries = []) {
  const score = {}
  for (const e of entries) {
    const sets = (e.sets || []).filter((s) => s.done && !s.warmup && (Number(s.reps) || 0) > 0).length
    credit(score, { id: e.exerciseId }, sets)
  }
  return normalize(score)
}

// A PLANNED day/session (Builder, program view): weight each exercise by its
// prescribed set count, so the map updates live as you add/edit exercises.
export function plannedMuscleHeat(exercises = []) {
  const score = {}
  for (const ex of exercises) credit(score, ex, Number(ex.sets) || 0)
  return normalize(score)
}
