import { estimate1RM } from '../lib/oneRepMax.js'
import { exMeasure } from '../data/exercises.js'
import ProgressChart from './ProgressChart.jsx'

const ACCENT = '#10b981'

// Top-set label for one session's done sets.
function fmtTop(done, units) {
  const withW = done.filter((s) => Number(s.weight) > 0)
  if (withW.length) {
    const top = withW.reduce((a, b) => (Number(b.weight) > Number(a.weight) ? b : a))
    return `${top.weight} ${units} × ${top.reps}`
  }
  return `${done.length} × ${done[0].reps} reps`
}

// A focused view of one exercise: its trend, best marks, and recent sessions.
export default function ExerciseDetail({ exId, name, history, units, onClose }) {
  const measure = exMeasure({ id: exId })
  const weightedByDefault = measure.type === 'reps'

  const points = [] // oldest → newest, for the chart
  const sessions = [] // newest → oldest, for the list
  let bestE1RM = 0
  let topWeight = 0
  let maxReps = 0

  for (const w of history) { // newest first
    const e = (w.entries || []).find((x) => x.exerciseId === exId)
    if (!e) continue
    const done = (e.sets || []).filter((s) => s.done && !s.warmup && Number(s.reps) > 0)
    if (!done.length) continue
    let e1 = 0
    let tw = 0
    let mr = 0
    for (const s of done) {
      const wt = Number(s.weight) || 0
      const r = Number(s.reps) || 0
      mr = Math.max(mr, r)
      if (wt > 0) { tw = Math.max(tw, wt); e1 = Math.max(e1, estimate1RM(wt, r)) }
    }
    bestE1RM = Math.max(bestE1RM, e1)
    topWeight = Math.max(topWeight, tw)
    maxReps = Math.max(maxReps, mr)
    const value = tw > 0 ? Math.round(weightedByDefault ? e1 : tw) : mr
    points.unshift({ t: new Date(w.date).getTime(), weight: value }) // build oldest→newest
    sessions.push({ date: w.date, label: fmtTop(done, units) })
  }

  const weighted = topWeight > 0
  const series = points.length ? [{ id: exId, name, color: ACCENT, points }] : []
  const metricLabel = weighted ? (weightedByDefault ? `Estimated 1RM (${units})` : `Top set (${units})`) : 'Best set (reps)'

  return (
    <div className="picker-overlay" role="dialog" aria-label={name} onClick={onClose}>
      <div className="detail-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="detail-head">
          <p className="info-title">{name}</p>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="detail-stats">
          {weighted && <div className="detail-stat"><span className="detail-stat-num">{bestE1RM ? Math.round(bestE1RM) : '—'}</span><span className="muted small">best e1RM</span></div>}
          {weighted && <div className="detail-stat"><span className="detail-stat-num">{topWeight || '—'}</span><span className="muted small">top weight</span></div>}
          <div className="detail-stat"><span className="detail-stat-num">{maxReps || '—'}</span><span className="muted small">most reps</span></div>
          <div className="detail-stat"><span className="detail-stat-num">{sessions.length}</span><span className="muted small">sessions</span></div>
        </div>

        <p className="group-label">{metricLabel} over time</p>
        {series.length ? <ProgressChart series={series} units={units} /> : <p className="muted small">No logged sets yet.</p>}

        <p className="group-label">Recent sessions</p>
        <div className="detail-sessions">
          {sessions.slice(0, 10).map((s, i) => (
            <div className="log-row" key={i}>
              <span>{new Date(s.date).toLocaleDateString()}</span>
              <span className="muted small">{s.label}</span>
            </div>
          ))}
          {sessions.length === 0 && <p className="muted small">Nothing logged yet.</p>}
        </div>

        <button type="button" className="btn btn-primary" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}
