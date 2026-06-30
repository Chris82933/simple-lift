import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadHistory, loadSettings, loadCardio, deleteWorkout, deleteCardio } from '../lib/storage.js'
import { CARDIO_BY_ID } from '../data/cardio.js'
import ProgressChart from '../components/ProgressChart.jsx'

// Chart palette — mid-tone hues that stay legible on both light and dark cards.
const PALETTE = ['#10b981', '#ff4d4d', '#3b9fd6', '#e0a800', '#e84393', '#8b5cf6', '#14b8a6', '#f97316']

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

const DIFF_LABELS = {
  easy: '😎 Easy', moderate: '🙂 Just right', hard: '😤 Hard', maxed: '🥵 Maxed out',
}

// One expandable session in the log — collapsed shows the top set per exercise,
// expanded reveals every set logged. Also surfaces difficulty + notes.
function SessionEntry({ workout, units, onDelete }) {
  const [open, setOpen] = useState(false)
  const setCount = workout.entries.reduce((n, e) => n + (e.sets?.filter((s) => s.done).length || 0), 0)
  return (
    <div className="log-entry">
      <div className="log-head">
        <span className="ex-name">{workout.sessionTitle}</span>
        <span className="muted small">{new Date(workout.date).toLocaleDateString()}</span>
        <button type="button" className="icon-btn log-del" onClick={() => onDelete(workout)} aria-label="Delete this session">✕</button>
      </div>
      <div className="log-meta">
        {workout.difficulty && <span className="diff-badge">{DIFF_LABELS[workout.difficulty] || workout.difficulty}</span>}
        <span className="muted small">{setCount} set{setCount === 1 ? '' : 's'} done</span>
      </div>
      <div className="log-exercises">
        {workout.entries.map((e, j) => (
          <div key={j}>
            <div className="log-row">
              <span>{e.name}{e.adhoc ? ' ＋' : ''}</span>
              <span className="muted small">{topSet(e)} {units}</span>
            </div>
            {open && (
              <div className="log-sets">
                {(e.sets || []).map((s, k) => (
                  <div className="log-set-row" key={k}>
                    <span>Set {k + 1}{s.done ? ' ✓' : ''}</span>
                    <span>{Number(s.weight) > 0 ? `${s.weight} ${units} × ` : ''}{s.reps || '–'} reps</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {workout.notes && <p className="muted small log-note">📝 {workout.notes}</p>}
      <button type="button" className="log-toggle" onClick={() => setOpen((o) => !o)}>
        {open ? '▴ Hide sets' : '▾ Show all sets'}
      </button>
    </div>
  )
}

const CARDIO_METRICS = [
  { id: 'time', label: 'Time (min)', field: (c) => c.durationMin },
  { id: 'distance', label: 'Distance', field: (c) => c.distance },
  { id: 'calories', label: 'Calories', field: (c) => c.calories },
]

// Group cardio entries into per-machine series for the chosen metric.
function buildCardioSeries(cardio, metricId) {
  const metric = CARDIO_METRICS.find((m) => m.id === metricId)
  const byMachine = {}
  for (const c of [...cardio].reverse()) {
    const v = Number(metric.field(c))
    if (!v) continue
    const m = CARDIO_BY_ID[c.machine]
    if (!byMachine[c.machine]) byMachine[c.machine] = { id: c.machine, name: m?.name || c.machineName, color: m?.color || '#94a3b8', points: [] }
    byMachine[c.machine].points.push({ t: new Date(c.date).getTime(), weight: v })
  }
  return Object.values(byMachine).filter((s) => s.points.length > 0)
}

export default function Progress() {
  const navigate = useNavigate()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const history = loadHistory()
  const cardio = loadCardio()
  const units = loadSettings().units || 'lbs'

  const removeSession = (w) => {
    if (window.confirm(`Delete "${w.sessionTitle}" from ${new Date(w.date).toLocaleDateString()}? This can't be undone.`)) {
      deleteWorkout(w.date)
      refresh()
    }
  }
  const removeCardio = (c) => {
    if (window.confirm('Delete this cardio entry?')) {
      deleteCardio(c.id)
      refresh()
    }
  }
  const allSeries = useMemo(() => buildSeries(history), [history])
  const [cardioMetric, setCardioMetric] = useState('time')
  const cardioSeries = useMemo(() => buildCardioSeries(cardio, cardioMetric), [cardio, cardioMetric])

  // Default: show up to the 5 most-tracked exercises.
  const [hidden, setHidden] = useState(() => new Set(allSeries.slice(5).map((s) => s.id)))
  const toggle = (id) => setHidden((h) => {
    const n = new Set(h)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const visible = allSeries.filter((s) => !hidden.has(s.id))

  if (history.length === 0 && cardio.length === 0) {
    return (
      <section className="page">
        <header className="page-header"><h1>Progress</h1></header>
        <div className="card placeholder-card">
          <p className="placeholder-title">No sessions yet</p>
          <p className="muted">Finish a workout or log some cardio and it&apos;ll show up here — with charts of your progress over time.</p>
          <Link className="btn btn-primary" to="/today">Go to today</Link>
          <button className="btn btn-ghost" onClick={() => navigate('/cardio')}>Log cardio</button>
        </div>
      </section>
    )
  }

  return (
    <section className="page">
      <header className="page-header">
        <h1>Progress</h1>
        <p className="muted">{history.length} session{history.length === 1 ? '' : 's'} · {cardio.length} cardio logged.</p>
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

      {/* ---- Cardio ---- */}
      <div className="card">
        <div className="week-head">
          <p className="group-label" style={{ margin: 0 }}>Cardio over time</p>
          <button className="link-sm" onClick={() => navigate('/cardio')}>＋ Log</button>
        </div>
        <div className="seg metric-seg">
          {CARDIO_METRICS.map((m) => (
            <button key={m.id} type="button" className={'seg-item' + (cardioMetric === m.id ? ' is-selected' : '')} onClick={() => setCardioMetric(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        {cardioSeries.length > 0 ? (
          <>
            <ProgressChart series={cardioSeries} />
            <div className="legend">
              {cardioSeries.map((s) => (
                <span key={s.id} className="legend-item static">
                  <span className="legend-swatch" style={{ background: s.color }} />{s.name}
                </span>
              ))}
            </div>
          </>
        ) : (
          <p className="muted small">No cardio with this stat yet. <button className="link-btn" onClick={() => navigate('/cardio')}>Log some</button>.</p>
        )}
        {cardio.length > 0 && (
          <div className="cardio-loglist">
            {cardio.slice(0, 8).map((c) => {
              const m = CARDIO_BY_ID[c.machine]
              return (
                <div className="log-row" key={c.id}>
                  <span>{m?.icon} {c.machineName}</span>
                  <span className="muted small">
                    {c.durationMin}m{c.distance ? ` · ${c.distance}${c.distanceUnit}` : ''}{c.avgHr ? ` · ${c.avgHr}bpm` : ''} · {new Date(c.date).toLocaleDateString()}
                  </span>
                  <button type="button" className="icon-btn log-del" onClick={() => removeCardio(c)} aria-label="Delete this cardio entry">✕</button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {history.length > 0 && (
      <div className="card">
        <p className="group-label">Session log</p>
        {history.map((w, i) => (
          <SessionEntry key={w.date || i} workout={w} units={units} onDelete={removeSession} />
        ))}
      </div>
      )}
    </section>
  )
}
