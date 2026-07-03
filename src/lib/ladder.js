// Look up an exercise's position in its bodyweight progression ladder, so the
// workout can show "step 3 of 7 → next: Band-Assisted Pull-Up" and make the
// harder-variation path visible. Returns null for exercises not on a ladder.
import { LADDERS, EXERCISE_BY_ID } from '../data/exercises.js'

export function ladderInfo(exId) {
  for (const ladder of LADDERS) {
    const index = ladder.order.indexOf(exId)
    if (index === -1) continue
    const nextId = ladder.order[index + 1] || null
    const prevId = ladder.order[index - 1] || null
    return {
      ladderName: ladder.name,
      index,
      length: ladder.order.length,
      nextId,
      nextName: nextId ? EXERCISE_BY_ID[nextId]?.name || null : null,
      prevId,
      prevName: prevId ? EXERCISE_BY_ID[prevId]?.name || null : null,
    }
  }
  return null
}
