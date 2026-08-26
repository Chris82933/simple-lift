// Small pure helpers that make in-workout logging faster.

// The working weight from the most recent session that logged each lift, so the
// weight box can prefill it — you rarely retype what you did last time. Only
// lifts that were actually loaded appear; a bodyweight set (weight 0) is skipped
// so pure bodyweight moves stay blank. `history` is newest-first.
export function lastWeightFromHistory(history = []) {
  const map = {}
  for (const w of history) {
    for (const e of w.entries || []) {
      if (map[e.exerciseId] != null) continue
      const wt = (e.sets || [])
        .filter((s) => s.done && !s.warmup && Number(s.reps) > 0)
        .map((s) => Number(s.weight) || 0)
        .find((x) => x > 0)
      if (wt) map[e.exerciseId] = wt
    }
  }
  return map
}

// Copy the first working set's weight & reps into every later working set that
// isn't done yet — one tap for straight sets instead of retyping. Warm-ups and
// already-completed sets are left untouched.
export function fillDownRows(rows = []) {
  const firstIdx = rows.findIndex((r) => !r.warmup)
  if (firstIdx === -1) return rows
  const src = rows[firstIdx]
  return rows.map((r, i) =>
    r.warmup || r.done || i <= firstIdx ? r : { ...r, weight: src.weight, reps: src.reps })
}
