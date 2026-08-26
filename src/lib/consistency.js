// Training-consistency and personal-record helpers derived from workout
// history. Pure functions — history is the array from loadHistory() (newest
// first). Weeks run Monday–Sunday in the viewer's local time.

// Midnight on the Monday of the week containing `d`, as a timestamp.
export function weekStart(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  const dow = (x.getDay() + 6) % 7 // Mon=0 … Sun=6
  x.setDate(x.getDate() - dow)
  return x.getTime()
}

const WEEK = 7 * 24 * 60 * 60 * 1000

// How many workouts fall in the same week as `now`.
export function sessionsThisWeek(history = [], now = Date.now()) {
  const wk = weekStart(now)
  return history.filter((w) => weekStart(w.date) === wk).length
}

// Consecutive weeks (ending at the current week) that have at least one
// workout. The current week counts once it has one; while it's still empty the
// streak is preserved from last week — you haven't missed a whole week yet.
export function trainingStreakWeeks(history = [], now = Date.now()) {
  if (!history.length) return 0
  const weeks = new Set(history.map((w) => weekStart(w.date)))
  let cur = weekStart(now)
  if (!weeks.has(cur)) cur -= WEEK // grace for the in-progress week
  let streak = 0
  while (weeks.has(cur)) { streak += 1; cur -= WEEK }
  return streak
}

// Workout count for each of the last `n` weeks, oldest → newest — for a
// sparkline. Always returns `n` entries (zero-filled).
export function weeklyCounts(history = [], now = Date.now(), n = 8) {
  const thisWk = weekStart(now)
  const counts = new Map()
  for (const w of history) {
    const k = weekStart(w.date)
    counts.set(k, (counts.get(k) || 0) + 1)
  }
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const k = thisWk - i * WEEK
    out.push({ weekStart: k, count: counts.get(k) || 0 })
  }
  return out
}

// Total working-set volume (weight × reps, completed sets only) this week.
export function volumeThisWeek(history = [], now = Date.now()) {
  const wk = weekStart(now)
  let vol = 0
  for (const w of history) {
    if (weekStart(w.date) !== wk) continue
    for (const e of w.entries || []) {
      for (const s of e.sets || []) {
        if (s.done && !s.warmup) vol += (Number(s.weight) || 0) * (Number(s.reps) || 0)
      }
    }
  }
  return Math.round(vol)
}

// Every personal record across history, flattened into a newest-first timeline
// (each carries the date of the session it was set in).
export function prTimeline(history = []) {
  const out = []
  for (const w of history) { // newest first
    for (const pr of w.prs || []) out.push({ date: w.date, ...pr })
  }
  return out
}
