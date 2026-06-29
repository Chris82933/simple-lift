import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { loadHistory, loadSettings } from '../lib/storage.js'
import ProgressChart from '../components/ProgressChart.jsx'

const PALETTE = ['#38bdf8', '#f472b6', '#4ade80', '#fbbf24', '#a78bfa', '#fb7185', '#22d3ee', '#facc15']

// Build per-exercise weight series (top set per session) from history.
function buildSeries(history) {
  const byEx = {}
  // oldest → newest
  for (const w of [...history].reverse()) {
    const t = new Date(w.date).getTime()
    for (const e of w.entries) {
      const weights = (e.sets || []).map((s) => Number(s.weight) || 0).filter((x) => x > 0)
      if (weights.length === 0) continue
      const top = Math.max(...weights)
      if (!byEx[e.exerciseId]) byEx[e.exerciseId] = { id: e.exerciseId, name: e.name, points: [] }
      byEx[e.exerciseId].points.push({ t, weight: top })
    }
  }
  return Object.values(byEx)
    .filter((s) => s.points.length > 0)
    .sort((a, b) => b.points.length - a.points.length)
    .map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }))
}

function topSet(entry) {
  const withW = (entry.sets || []).filter((s) => Number(s.weight) > 0)
  if (withW.length) {
    const t = withW.reduce((a, b) => (Number(b.weight) > Number(a.weight) ? b : a))
    return `${t.weight} × ${t.reps}`
  }
  const done = (entry.sets || []).filter((s) => Number(s.reps) > 0)
  return done.length ? `${done.length} × ${done[0].reps}` : '—'
}

export default function Progress() {
  const history = loadHistory()
  const units = loadSettings().units || 'lbs'
  const allSeries = useMemo(() => buildSeries(history), [history])

  // Default: show up to the 5 most-tracked exercises.
  const [hidden, setHidden] = useState(() => new Set(allSeries.slice(5).map((s) => s.id)))
  const toggle = (id) => setHidden((h) => {
    const n = new Set(h)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const visible = allSeries.filter((s) => !hidden.has(s.id))

  if (history.length === 0) {
    return (
      <section className="page">
        <header className="page-header"><h1>Progress</h1></header>
        <div className="card placeholder-card">
          <p className="placeholder-title">No sessions yet</p>
          <p className="muted">Finish a workout and it&apos;ll show up here — with a chart of your weights climbing over time.</p>
          <Link className="btn btn-primary" to="/today">Go to today</Link>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Progress</h1>
        <p className="muted">{history.length} session{history.length === 1 ? '' : 's'} logged.</p>
      </header>

      <div className="card">
        <p className="group-label">Weight over time ({units})</p>
        <ProgressChart series={visible} units={units} />
        {allSeries.length > 0 && (
          <div className="legend">
            {allSeries.map((s) => (
              <button
                key={s.id}
                type="button"
                className={'legend-item' + (hidden.has(s.id) ? ' is-off' : '')}
                onClick={() => toggle(s.id)}
              >
                <span className="legend-swatch" style={{ background: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
        )}
        {allSeries.length === 0 && (
          <p className="muted small">Weighted lifts will plot here once you log some.</p>
        )}
      </div>

      <div className="card">
        <p className="group-label">Session log</p>
        {history.map((w, i) => (
          <div className="log-entry" key={i}>
            <div className="log-head">
              <span className="ex-name">{w.sessionTitle}</span>
              <span className="muted small">{new Date(w.date).toLocaleDateString()}</span>
            </div>
            <div className="log-exercises">
              {w.entries.map((e, j) => (
                <div className="log-row" key={j}>
                  <span>{e.name}</span>
                  <span className="muted small">{topSet(e)} {units}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
