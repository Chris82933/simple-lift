import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadHistory, loadSettings, saveSettings, loadCardio, deleteWorkout, deleteCardio, insertWorkoutAt, insertCardioAt, loadBodyweight } from '../lib/storage.js'
import { CARDIO_BY_ID } from '../data/cardio.js'
import { exMeasure } from '../data/exercises.js'
import { estimate1RM } from '../lib/oneRepMax.js'
import ProgressChart from '../components/ProgressChart.jsx'
import ExerciseDetail from '../components/ExerciseDetail.jsx'
import { useToast } from '../components/Toast.jsx'

// Chart palette — mid-tone hues that stay legible on both light and dark cards.
const PALETTE = ['#10b981', '#ff4d4d', '#3b9fd6', '#e0a800', '#e84393', '#8b5cf6', '#14b8a6', '#f97316']

// Build per-exercise weight series from history. metric 'top' plots the heaviest
// set each session; 'e1rm' plots the best estimated 1RM (weight × reps), which
// rewards rep PRs too, not just heavier bars. Warm-up sets are excluded.
function buildSeries(history, metric = 'top') {
  const byEx = {}
  // oldest → newest
  for (const w of [...history].reverse()) {
    const t = new Date(w.date).getTime()
    for (const e of w.entries) {
      const loaded = (e.sets || []).filter((s) => !s.warmup && Number(s.weight) > 0)
      if (loaded.length === 0) continue
      const value = metric === 'e1rm'
        ? Math.round(Math.max(...loaded.map((s) => estimate1RM(Number(s.weight), Number(s.reps) || 1))))
        : Math.max(...loaded.map((s) => Number(s.weight)))
      if (!byEx[e.exerciseId]) byEx[e.exerciseId] = { id: e.exerciseId, name: e.name, points: [] }
      byEx[e.exerciseId].points.push({ t, weight: value })
    }
  }
  return Object.values(byEx)
    .filter((s) => s.points.length > 0)
    .sort((a, b) => b.points.length - a.points.length)
    .map((s, i) => ({ ...s, color: PALETTE[i % PALETTE.length] }))
}

// Build per-exercise rep series for bodyweight moves (best set's reps per
// session) so calisthenics progress is visible even with no weight on the bar.
// Skips anything with weight logged (that's on the main chart) and timed/
// distance moves (seconds and km don't share an axis with reps).
function buildBodyweightSeries(history) {
  const byEx = {}
  for (const w of [...history].reverse()) {
    const t = new Date(w.date).getTime()
    for (const e of w.entries) {
      const sets = e.sets || []
      if (sets.some((s) => Number(s.weight) > 0)) continue
      if (exMeasure({ id: e.exerciseId }).type !== 'reps') continue
      const reps = sets.filter((s) => s.done).map((s) => Number(s.reps) || 0).filter((x) => x > 0)
      if (reps.length === 0) continue
      if (!byEx[e.exerciseId]) byEx[e.exerciseId] = { id: e.exerciseId, name: e.name, points: [] }
      byEx[e.exerciseId].points.push({ t, weight: Math.max(...reps) })
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
const DIFF_EMOJI = { easy: '😎', moderate: '🙂', hard: '😤', maxed: '🥵' }
const shortDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })

// A card whose body can be collapsed. The open/closed state is owned by the
// page (and persisted to settings), so the layout is remembered.
function CollapsibleCard({ title, subtitle, open, onToggle, children }) {
  return (
    <div className="card collapsible">
      <button type="button" className="collapse-head" onClick={onToggle} aria-expanded={open}>
        <span className="collapse-title">{title}</span>
        {subtitle && <span className="muted small collapse-sub">{subtitle}</span>}
        <span className={'collapse-chevron' + (open ? ' is-open' : '')} aria-hidden="true">▾</span>
      </button>
      {open && <div className="collapse-body">{children}</div>}
    </div>
  )
}

// One session in the log. Collapsed it's a compact two-line summary; tapping it
// opens the detail — per-exercise completion, PRs, rating, notes, and (opt-in)
// every logged set.
function SessionEntry({ workout, units, onDelete }) {
  const [open, setOpen] = useState(false)
  const [showSets, setShowSets] = useState(false)
  const entries = workout.entries || []
  const working = (e) => (e.sets || []).filter((s) => !s.warmup)
  const setCount = entries.reduce((n, e) => n + working(e).filter((s) => s.done).length, 0)
  const exDone = entries.filter((e) => working(e).some((s) => s.done)).length
  const volume = entries.reduce((v, e) => v + working(e).filter((s) => s.done)
    .reduce((a, s) => a + (Number(s.weight) || 0) * (Number(s.reps) || 0), 0), 0)
  const prs = workout.prs || []
  const prIds = new Set(prs.map((p) => p.exId))

  return (
    <div className={'log-entry' + (open ? ' is-open' : '')}>
      <button type="button" className="log-summary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="log-summary-text">
          <span className="log-summary-title">{workout.sessionTitle}</span>
          <span className="muted small">
            {exDone}/{entries.length} moves · {setCount} set{setCount === 1 ? '' : 's'}
            {volume > 0 ? ` · ${Math.round(volume).toLocaleString()} ${units}` : ''}
          </span>
        </span>
        <span className="log-summary-side">
          {prIds.size > 0 && <span className="pr-badge">🏆 {prIds.size}</span>}
          {workout.difficulty && <span title={DIFF_LABELS[workout.difficulty]}>{DIFF_EMOJI[workout.difficulty]}</span>}
          <span className="muted small">{shortDate(workout.date)}</span>
          <span className={'collapse-chevron' + (open ? ' is-open' : '')} aria-hidden="true">▾</span>
        </span>
      </button>

      {open && (
        <div className="log-detail">
          <div className="log-meta">
            {workout.difficulty && <span className="diff-badge">{DIFF_LABELS[workout.difficulty]}</span>}
            <span className="muted small">{new Date(workout.date).toLocaleDateString()}</span>
          </div>
          {prs.length > 0 && <p className="muted small">🏆 New records: {prs.map((p) => p.name).join(', ')}</p>}
          <div className="log-exercises">
            {entries.map((e, j) => {
              const rows = working(e)
              const done = rows.filter((s) => s.done).length
              const skipped = done === 0
              return (
                <div key={j} className={skipped ? 'log-ex is-skipped' : 'log-ex'}>
                  <div className="log-row">
                    <span className="log-ex-name">
                      <span className={'log-status' + (skipped ? '' : ' is-done')} aria-hidden="true">{skipped ? '○' : '✓'}</span>
                      {e.name}{e.adhoc ? ' ＋' : ''}{prIds.has(e.exerciseId) ? ' 🏆' : ''}
                    </span>
                    <span className="muted small">
                      {skipped ? 'not done' : `${done}/${rows.length} sets · ${topSet(e)} ${units}`}
                    </span>
                  </div>
                  {showSets && (
                    <div className="log-sets">
                      {(e.sets || []).map((s, k) => (
                        <div className="log-set-row" key={k}>
                          <span>{s.warmup ? 'Warm-up' : `Set ${k + 1}`}{s.done ? ' ✓' : ''}</span>
                          <span>{Number(s.weight) > 0 ? `${s.weight} ${units} × ` : ''}{s.reps || '–'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          {workout.notes && <p className="muted small log-note">📝 {workout.notes}</p>}
          <div className="log-detail-actions">
            <button type="button" className="log-toggle" onClick={() => setShowSets((s) => !s)}>
              {showSets ? '▴ Hide every set' : '▾ Show every set'}
            </button>
            <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => onDelete(workout)}>Delete</button>
          </div>
        </div>
      )}
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
  const toast = useToast()
  const [, setVersion] = useState(0)
  const refresh = () => setVersion((v) => v + 1)
  const history = loadHistory()
  const cardio = loadCardio()
  const bodyweightLog = loadBodyweight()
  const units = loadSettings().units || 'lbs'
  const [detailEx, setDetailEx] = useState(null) // { id, name } for the detail sheet

  // Delete immediately, offer Undo via toast (no blocking confirm dialog).
  const removeSession = (w) => {
    const idx = history.indexOf(w)
    deleteWorkout(w.date)
    refresh()
    toast.show('Session deleted', { actionLabel: 'Undo', onAction: () => { insertWorkoutAt(w, idx); refresh() } })
  }
  const removeCardio = (c) => {
    const idx = cardio.indexOf(c)
    deleteCardio(c.id)
    refresh()
    toast.show('Cardio entry deleted', { actionLabel: 'Undo', onAction: () => { insertCardioAt(c, idx); refresh() } })
  }
  const [weightMetric, setWeightMetric] = useState('top') // 'top' | 'e1rm'
  const allSeries = useMemo(() => buildSeries(history, weightMetric), [history, weightMetric])
  const bwSeries = useMemo(() => buildBodyweightSeries(history), [history])
  // The lifter's own weight — one series, oldest → newest.
  const bodyweightSeries = useMemo(() => [{
    id: 'bodyweight',
    name: 'Bodyweight',
    color: PALETTE[5],
    points: [...bodyweightLog]
      .map((e) => ({ t: new Date(e.date).getTime(), weight: Number(e.weight) || 0 }))
      .filter((p) => p.weight > 0 && !Number.isNaN(p.t))
      .sort((a, b) => a.t - b.t),
  }], [bodyweightLog])
  // Every exercise that appears in history, for the tappable per-exercise list.
  const exercisesTracked = useMemo(() => {
    const seen = new Map()
    for (const w of history) for (const e of w.entries || []) {
      if (!seen.has(e.exerciseId)) seen.set(e.exerciseId, e.name)
    }
    return [...seen].map(([id, name]) => ({ id, name }))
  }, [history])
  const [bwHidden, setBwHidden] = useState(() => new Set())
  const toggleBw = (id) => setBwHidden((h) => {
    const n = new Set(h)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const bwVisible = bwSeries.filter((s) => !bwHidden.has(s.id))
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

  // Which cards are expanded — remembered between visits (saving fires the
  // global "✓ Saved" flash).
  const [cards, setCards] = useState(() => loadSettings().progressCards || {})
  const cardOpen = (id) => cards[id] !== false
  const toggleCard = (id) => {
    const next = { ...cards, [id]: !cardOpen(id) }
    setCards(next)
    saveSettings({ ...loadSettings(), progressCards: next })
  }

  // Keep the log short by default; load more on demand.
  const PAGE = 8
  const [shownSessions, setShownSessions] = useState(PAGE)

  // Weigh-ins alone are enough to have something worth showing here.
  if (history.length === 0 && cardio.length === 0 && bodyweightLog.length < 2) {
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

      <CollapsibleCard
        title={`${weightMetric === 'e1rm' ? 'Estimated 1RM' : 'Top set'} over time (${units})`}
        open={cardOpen('weight')}
        onToggle={() => toggleCard('weight')}
      >
        <div className="seg metric-seg">
          {[{ id: 'top', label: 'Top set' }, { id: 'e1rm', label: 'Est. 1RM' }].map((m) => (
            <button key={m.id} type="button" className={'seg-item' + (weightMetric === m.id ? ' is-selected' : '')} onClick={() => setWeightMetric(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
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
      </CollapsibleCard>

      {/* ---- Bodyweight over time ---- */}
      {bodyweightLog.length > 1 && (
        <CollapsibleCard
          title={`Bodyweight over time (${units})`}
          subtitle={`${bodyweightLog[0].weight} ${units} now`}
          open={cardOpen('bodyweight')}
          onToggle={() => toggleCard('bodyweight')}
        >
          <ProgressChart series={bodyweightSeries} units={units} />
          <p className="muted small">
            From your weigh-ins in Settings. Also used to score weighted pull-ups and dips as
            bodyweight + added load.
          </p>
        </CollapsibleCard>
      )}

      {/* ---- Bodyweight reps ---- */}
      {bwSeries.length > 0 && (
        <CollapsibleCard title="Bodyweight reps over time" open={cardOpen('bw')} onToggle={() => toggleCard('bw')}>
          <ProgressChart series={bwVisible} />
          <div className="legend">
            {bwSeries.map((s) => (
              <button
                key={s.id}
                type="button"
                className={'legend-item' + (bwHidden.has(s.id) ? ' is-off' : '')}
                onClick={() => toggleBw(s.id)}
              >
                <span className="legend-swatch" style={{ background: s.color }} />
                {s.name}
              </button>
            ))}
          </div>
          <p className="muted small">Best set&apos;s reps each session — watch these climb, then level up the movement.</p>
        </CollapsibleCard>
      )}

      {/* ---- Per-exercise history ---- */}
      {exercisesTracked.length > 0 && (
        <CollapsibleCard
          title="Exercise history"
          subtitle={`${exercisesTracked.length} tracked`}
          open={cardOpen('exlist')}
          onToggle={() => toggleCard('exlist')}
        >
          <p className="muted small">Tap a lift to see its own trend, best marks, and recent sessions.</p>
          <div className="exercise-history-list">
            {exercisesTracked.map((ex) => (
              <button key={ex.id} type="button" className="ex-history-row" onClick={() => setDetailEx(ex)}>
                <span>{ex.name}</span>
                <span className="ex-history-chevron" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
        </CollapsibleCard>
      )}

      {/* ---- Cardio ---- */}
      <CollapsibleCard
        title="Cardio over time"
        subtitle={cardio.length ? `${cardio.length} logged` : null}
        open={cardOpen('cardio')}
        onToggle={() => toggleCard('cardio')}
      >
        <button className="link-sm" onClick={() => navigate('/cardio')}>＋ Log cardio</button>
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
      </CollapsibleCard>

      {history.length > 0 && (
        <CollapsibleCard
          title="Session log"
          subtitle={`${history.length} session${history.length === 1 ? '' : 's'}`}
          open={cardOpen('log')}
          onToggle={() => toggleCard('log')}
        >
          {history.slice(0, shownSessions).map((w, i) => (
            <SessionEntry key={w.date || i} workout={w} units={units} onDelete={removeSession} />
          ))}
          {history.length > shownSessions && (
            <button type="button" className="btn btn-ghost btn-sm show-more" onClick={() => setShownSessions((n) => n + PAGE)}>
              Show {Math.min(PAGE, history.length - shownSessions)} more · {shownSessions} of {history.length}
            </button>
          )}
          {history.length > PAGE && shownSessions >= history.length && (
            <button type="button" className="btn btn-ghost btn-sm show-more" onClick={() => setShownSessions(PAGE)}>
              Collapse list
            </button>
          )}
        </CollapsibleCard>
      )}

      {detailEx && (
        <ExerciseDetail
          exId={detailEx.id}
          name={detailEx.name}
          history={history}
          units={units}
          onClose={() => setDetailEx(null)}
        />
      )}
    </section>
  )
}
