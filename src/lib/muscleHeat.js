// Per-muscle usage intensity for a finished session, for the end-of-workout
// heatmap. Each completed working set credits its primary muscles fully and its
// secondary muscles at half; scores are normalized to the hardest-hit muscle
// (0–1). Set count — not load — so bodyweight and timed work count too.
//
// It's a deliberately simple proxy for "what did I emphasize today", built on
// the same pattern-based muscle data as the exercise icons (see musclesFor).
import { musclesFor } from '../data/exercises.js'

const SECONDARY_WEIGHT = 0.5

export function sessionMuscleHeat(entries = []) {
  const score = {}
  for (const e of entries) {
    const sets = (e.sets || []).filter((s) => s.done && !s.warmup && (Number(s.reps) || 0) > 0).length
    if (!sets) continue
    const { primary, secondary } = musclesFor({ id: e.exerciseId })
    for (const m of primary) score[m] = (score[m] || 0) + sets
    for (const m of secondary) score[m] = (score[m] || 0) + sets * SECONDARY_WEIGHT
  }
  const max = Math.max(0, ...Object.values(score))
  if (max <= 0) return {}
  const heat = {}
  for (const [m, v] of Object.entries(score)) heat[m] = v / max
  return heat
}
