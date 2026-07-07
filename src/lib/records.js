// Personal-record detection, 1RM updates, and a shareable session summary.
// Records are judged on estimated 1RM (weight × reps → e1RM) so a heavy triple
// and a lighter high-rep set are compared fairly. Warm-up sets never count.
import { estimate1RM } from './oneRepMax.js'

// The best a single exercise's sets achieved this session (warm-ups excluded).
function bestOfSets(sets) {
  let topWeight = 0
  let topE1RM = 0
  let topReps = 0
  let bestSet = null
  for (const s of sets || []) {
    if (s.warmup) continue
    const w = Number(s.weight) || 0
    const r = Number(s.reps) || 0
    if (!s.done || r <= 0) continue
    topReps = Math.max(topReps, r)
    if (w > 0) {
      topWeight = Math.max(topWeight, w)
      const e = estimate1RM(w, r)
      if (e > topE1RM) { topE1RM = e; bestSet = { weight: w, reps: r } }
    }
  }
  return { topWeight, topE1RM, topReps, bestSet }
}

// Best weight / e1RM / reps ever recorded per exercise, from prior sessions.
function historyBests(priorHistory) {
  const byEx = {}
  for (const w of priorHistory || []) {
    for (const e of w.entries || []) {
      const b = bestOfSets(e.sets)
      const cur = byEx[e.exerciseId] || { topWeight: 0, topE1RM: 0, topReps: 0 }
      byEx[e.exerciseId] = {
        topWeight: Math.max(cur.topWeight, b.topWeight),
        topE1RM: Math.max(cur.topE1RM, b.topE1RM),
        topReps: Math.max(cur.topReps, b.topReps),
      }
    }
  }
  return byEx
}

// Given this session's entries, the history *before* it, and saved maxes:
//  • prs          — new personal records set this session
//  • oneRMUpdates — lifts whose estimated 1RM beat the saved max (offer to save)
export function sessionRecords(entries, priorHistory, maxes = {}) {
  const bests = historyBests(priorHistory)
  const prs = []
  const oneRMUpdates = []
  for (const e of entries || []) {
    const b = bestOfSets(e.sets)
    const prior = bests[e.exerciseId]
    if (b.topE1RM > 0 && b.bestSet) {
      // A PR needs a prior baseline to beat (first-ever session isn't a "PR").
      if (prior && b.topE1RM > prior.topE1RM + 0.5) {
        prs.push({ exId: e.exerciseId, name: e.name, kind: 'e1rm', value: Math.round(b.topE1RM), set: b.bestSet })
      } else if (prior && b.topWeight > prior.topWeight) {
        prs.push({ exId: e.exerciseId, name: e.name, kind: 'weight', value: b.topWeight })
      }
      // Fresh 1RM estimate — a strong (often AMRAP) set beating the stored max.
      const savedRM = Math.round(Number(maxes[e.exerciseId]?.oneRM) || 0)
      const est = Math.round(b.topE1RM)
      if (est > savedRM) {
        oneRMUpdates.push({ exId: e.exerciseId, name: e.name, oneRM: est, weight: b.bestSet.weight, reps: b.bestSet.reps, prev: savedRM })
      }
    } else if (b.topReps > 0 && prior && b.topReps > prior.topReps) {
      // Bodyweight rep PR (no load, more reps than ever).
      prs.push({ exId: e.exerciseId, name: e.name, kind: 'reps', value: b.topReps })
    }
  }
  return { prs, oneRMUpdates }
}

// Short human label for a PR's magnitude.
export function prShort(pr, units) {
  if (pr.kind === 'e1rm') return `est. 1RM ${pr.value} ${units}`
  if (pr.kind === 'weight') return `${pr.value} ${units} top set`
  return `${pr.value} reps`
}

// Plain-text session recap for sharing (paste into Strava, notes, socials).
export function buildSessionSummary(title, entries, prs, { units, durationMin } = {}) {
  const body = []
  let volume = 0
  for (const e of entries || []) {
    const rows = (e.sets || []).filter((s) => s.done && !s.warmup && (Number(s.reps) || 0) > 0)
    if (!rows.length) continue
    const parts = rows.map((s) => {
      const w = Number(s.weight) || 0
      volume += w * (Number(s.reps) || 0)
      return w > 0 ? `${w}×${s.reps}` : `${s.reps}`
    })
    body.push(`${e.name} — ${parts.join(', ')}`)
  }
  const lines = [`${title} 🏋️`]
  const meta = []
  if (durationMin) meta.push(`${durationMin} min`)
  if (volume > 0) meta.push(`${Math.round(volume).toLocaleString()} ${units} volume`)
  if (meta.length) lines.push(meta.join(' · '))
  lines.push('', ...body)
  if (prs && prs.length) {
    lines.push('')
    for (const pr of prs) lines.push(`🏆 PR: ${pr.name} — ${prShort(pr, units)}`)
  }
  lines.push('', 'Tracked with Simple Lift')
  return lines.join('\n')
}
