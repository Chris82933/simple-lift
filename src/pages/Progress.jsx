import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { loadHistory, loadSettings, saveSettings, loadCardio, deleteWorkout, deleteCardio, insertWorkoutAt, insertCardioAt, loadBodyweight } from '../lib/storage.js'
import { CARDIO_BY_ID } from '../data/cardio.js'
import { exMeasure, musclesFor, matchesQuery, EXERCISE_BY_ID } from '../data/exercises.js'
import { estimate1RM } from '../lib/oneRepMax.js'
import { prShort } from '../lib/records.js'
import { sessionsThisWeek, trainingStreakWeeks, weeklyCounts, volumeThisWeek, prTimeline } from '../lib/consistency.js'
import ProgressChart from '../components/ProgressChart.jsx'
import ExerciseDetail from '../components/ExerciseDetail.jsx'
import { useToast } from '../components/Toast.jsx'
import Icon from '../components/Icon.jsx'

// Chart palette — the app's own accent tokens, so series stay on-brand and
// theme-aware (correct in both light and dark) instead of fixed hexes.
const PALETTE = [
  'var(--accent)', 'var(--accent-6)', 'var(--accent-5)',
  'var(--accent-3)', 'var(--accent-2)', 'var(--accent-4)',
]

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
  easy: 'Easy', moderate: 'Moderate', hard: 'Hard', maxed: 'Maxed out',
}
const shortDate = (d) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
// U4: humane "48 min" / "1h 12m" formatting for a session's recorded
// duration. Older history records won't have durationSec — callers only
// render this when it's a positive number.
const formatDuration = (sec) => {
  const mins = Math.round(sec / 60)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
const muscleLabel = (m) => m.replace(/_/g, ' ')

// Sections the user can reorder (the header + summary dashboard stay pinned on
// top). Ids match each card's collapse-state key so everything stays in sync.
const SECTION_LABELS = {
  prs: 'Personal records',
  weight: 'Lift progress',
  bodyweight: 'Bodyweight',
  bw: 'Bodyweight reps',
  exlist: 'Exercise history',
  cardio: 'Cardio',
  log: 'Session log',
}
const DEFAULT_ORDER = ['prs', 'weight', 'bodyweight', 'bw', 'exlist', 'cardio', 'log']
// Merge a saved order with the defaults: keep the saved positions, drop ids we
// no longer know, and append any new sections at the end — so a saved layout
// keeps working even as sections are added or removed in future versions.
const orderFrom = (saved) => {
  const known = new Set(DEFAULT_ORDER)
  const valid = Array.isArray(saved) ? saved.filter((id) => known.has(id)) : []
  const seen = new Set(valid)
  return [...valid, ...DEFAULT_ORDER.filter((id) => !seen.has(id))]
}

// A card whose body can be collapsed. The open/closed state is owned by the
// page (and persisted to settings), so the layout is remembered.
function CollapsibleCard({ title, subtitle, open, onToggle, children }) {
  return (
    <div className="card collapsible">
      <h2 className="collapse-heading">
        <button type="button" className="collapse-head" onClick={onToggle} aria-expanded={open}>
          <span className="collapse-title">{title}</span>
          {subtitle && <span className="muted small collapse-sub">{subtitle}</span>}
          <span className={'collapse-chevron' + (open ? ' is-open' : '')} aria-hidden="true">▾</span>
        </button>
      </h2>
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
            {Number(workout.durationSec) > 0 ? ` · ${formatDuration(workout.durationSec)}` : ''}
          </span>
        </span>
        <span className="log-summary-side">
          {prIds.size > 0 && <span className="pr-badge"><Icon name="trophy" size={13} /> {prIds.size}</span>}
          {workout.difficulty && <span className="muted small">{DIFF_LABELS[workout.difficulty]}</span>}
          <span className="muted small">{shortDate(workout.date)}</span>
          <span className={'collapse-chevron' + (open ? ' is-open' : '')} aria-hidden="true">▾</span>
        </span>
      </button>

      {open && (
        <div className="log-detail">
          <div className="log-meta">
            {workout.difficulty && <span className="diff-badge">{DIFF_LABELS[workout.difficulty]}</span>}
            <span className="muted small">
              {new Date(workout.date).toLocaleDateString()}
              {Number(workout.durationSec) > 0 ? ` · ${formatDuration(workout.durationSec)}` : ''}
            </span>
          </div>
          {prs.length > 0 && <p className="muted small"><Icon name="trophy" size={13} /> New records: {prs.map((p) => p.name).join(', ')}</p>}
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
                      {e.name}{e.adhoc ? ' ＋' : ''}{prIds.has(e.exerciseId) ? <> <Icon name="trophy" size={12} /></> : null}
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
          {workout.notes && <p className="muted small log-note">{workout.notes}</p>}
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

// U8: a single time-range control that governs every chart on the page (lift
// progress, bodyweight, bodyweight-reps, cardio) so months of history don't
// flatten recent trends. "All" keeps today's behavior.
const RANGE_OPTIONS = [
  { id: '8w', label: '8 weeks', days: 56 },
  { id: '6m', label: '6 months', days: 182 },
  { id: 'all', label: 'All', days: null },
]

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
  // R2: loadHistory/loadCardio/loadBodyweight each fully re-parse localStorage,
  // so they must run once per mount — not on every render (every toggle,
  // collapse, or keystroke). `refreshKey` is bumped by mutation handlers
  // (delete/undo) to force a re-load exactly when the underlying data changed.
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = () => setRefreshKey((v) => v + 1)
  const history = useMemo(() => loadHistory(), [refreshKey])
  const cardio = useMemo(() => loadCardio(), [refreshKey])
  const bodyweightLog = useMemo(() => loadBodyweight(), [refreshKey])
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
  // Every exercise that appears in history, newest-first, for the tappable
  // per-exercise list. Each entry carries its last-performed date and a count.
  const exercisesTracked = useMemo(() => {
    const seen = new Map()
    for (const w of history) for (const e of w.entries || []) {
      const cur = seen.get(e.exerciseId)
      if (!cur) seen.set(e.exerciseId, { id: e.exerciseId, name: e.name, lastDate: w.date, count: 1 })
      else cur.count++
    }
    return [...seen.values()]
  }, [history])

  // Exercise-history controls: good defaults (recency-sorted, capped) with
  // search + muscle-group filter revealed only when the list is long. No
  // persisted state — the list is short enough to re-derive on each visit.
  const EX_PAGE = 6
  const [exQuery, setExQuery] = useState('')
  const [exMuscle, setExMuscle] = useState('all')
  const [exShown, setExShown] = useState(EX_PAGE)

  const exMuscleOptions = useMemo(() => {
    const s = new Set()
    for (const ex of exercisesTracked) for (const m of musclesFor(ex.id).primary) s.add(m)
    return [...s]
  }, [exercisesTracked])

  const exFiltered = useMemo(() => exercisesTracked.filter((ex) => {
    if (exMuscle !== 'all' && !musclesFor(ex.id).primary.includes(exMuscle)) return false
    return matchesQuery(EXERCISE_BY_ID[ex.id] || { name: ex.name }, exQuery)
  }), [exercisesTracked, exQuery, exMuscle])

  const exActive = exQuery.trim() !== '' || exMuscle !== 'all'
  const exVisible = exActive ? exFiltered : exFiltered.slice(0, exShown)

  const [bwHidden, setBwHidden] = useState(() => new Set())
  const toggleBw = (id) => setBwHidden((h) => {
    const n = new Set(h)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const bwVisible = bwSeries.filter((s) => !bwHidden.has(s.id))
  const [cardioMetric, setCardioMetric] = useState('time')
  const cardioSeries = useMemo(() => buildCardioSeries(cardio, cardioMetric), [cardio, cardioMetric])

  // U8: time-range filter applied to every chart series below.
  const [chartRange, setChartRange] = useState('all')
  const rangeCutoff = useMemo(() => {
    const opt = RANGE_OPTIONS.find((o) => o.id === chartRange)
    return opt && opt.days ? Date.now() - opt.days * 86400000 : null
  }, [chartRange])
  const inRange = (list) => {
    if (!rangeCutoff) return list
    return list
      .map((s) => ({ ...s, points: s.points.filter((p) => p.t >= rangeCutoff) }))
      .filter((s) => s.points.length > 0)
  }

  // Default: show up to the 5 most-tracked exercises.
  const [hidden, setHidden] = useState(() => new Set(allSeries.slice(5).map((s) => s.id)))
  const toggle = (id) => setHidden((h) => {
    const n = new Set(h)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const visible = allSeries.filter((s) => !hidden.has(s.id))
  // Cap the legend so a big library doesn't flood the card; expand on demand.
  const [legendAll, setLegendAll] = useState(false)

  // Which cards are expanded — remembered between visits (saving fires the
  // global "✓ Saved" flash).
  const [cards, setCards] = useState(() => loadSettings().progressCards || {})
  // Primary cards (chart, PRs, weigh-ins) open by default; secondary ones start
  // collapsed so the first visit is scannable. Remembered once toggled.
  const CARD_DEFAULTS = { bw: false, exlist: false, cardio: false, log: false }
  const cardOpen = (id) => (cards[id] === undefined ? (CARD_DEFAULTS[id] ?? true) : cards[id])
  const toggleCard = (id) => {
    const next = { ...cards, [id]: !cardOpen(id) }
    setCards(next)
    saveSettings({ ...loadSettings(), progressCards: next })
  }

  // Consistency + records summary for the dashboard at the top of the page.
  const summary = useMemo(() => {
    const now = Date.now()
    return {
      total: history.length,
      thisWeek: sessionsThisWeek(history, now),
      streak: trainingStreakWeeks(history, now),
      weekly: weeklyCounts(history, now, 8),
      volume: volumeThisWeek(history, now),
    }
  }, [history])
  const prs = useMemo(() => prTimeline(history), [history])

  // Keep the log short by default; load more on demand.
  const PAGE = 8
  const [shownSessions, setShownSessions] = useState(PAGE)

  // Persisted section order + a layout edit mode to change it.
  const [order, setOrder] = useState(() => orderFrom(loadSettings().progressOrder))
  const [layoutEdit, setLayoutEdit] = useState(false)

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

  // Which sections have something to show right now.
  const sectionVisible = {
    prs: prs.length > 0,
    weight: true,
    bodyweight: bodyweightLog.length > 1,
    bw: bwSeries.length > 0,
    exlist: exercisesTracked.length > 0,
    cardio: true,
    log: history.length > 0,
  }
  const visibleOrder = order.filter((id) => sectionVisible[id])
  // CSS flex `order` drives the layout, so reordering never moves the chart DOM.
  const orderStyle = (id) => ({ order: order.indexOf(id) + 1 })
  // Move a section among the visible ones, swapping with the nearest visible
  // neighbour so hidden sections never create a dead step. Persists immediately.
  const moveSection = (id, dir) => {
    const target = visibleOrder[visibleOrder.indexOf(id) + dir]
    if (!target) return
    const arr = [...order]
    const a = arr.indexOf(id)
    const b = arr.indexOf(target)
    ;[arr[a], arr[b]] = [arr[b], arr[a]]
    setOrder(arr)
    saveSettings({ ...loadSettings(), progressOrder: arr })
  }

  return (
    <section className={'page' + (layoutEdit ? ' is-layout-edit' : '')}>
      <header className="page-header">
        <div className="progress-head-row">
          <div className="progress-head-text">
            <h1>Progress</h1>
            <p className="muted">{history.length} session{history.length === 1 ? '' : 's'} · {cardio.length} cardio logged.</p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              className={'edit-toggle' + (layoutEdit ? ' is-on' : '')}
              onClick={() => setLayoutEdit((v) => !v)}
              aria-pressed={layoutEdit}
            >
              {layoutEdit ? 'Done' : <><Icon name="edit" size={14} /> Layout</>}
            </button>
          )}
        </div>
      </header>

      {layoutEdit && (
        <div className="card layout-editor">
          <p className="group-label">Reorder sections</p>
          <p className="muted small">Use the arrows to move a section up or down. Your layout is saved automatically and used every time you open Progress.</p>
          <ul className="layout-list">
            {visibleOrder.map((id, i) => (
              <li className="layout-row" key={id}>
                <span className="layout-row-name">{SECTION_LABELS[id]}</span>
                <div className="ex-reorder">
                  <button type="button" className="icon-btn" disabled={i === 0} onClick={() => moveSection(id, -1)} aria-label={`Move ${SECTION_LABELS[id]} up`}>↑</button>
                  <button type="button" className="icon-btn" disabled={i === visibleOrder.length - 1} onClick={() => moveSection(id, 1)} aria-label={`Move ${SECTION_LABELS[id]} down`}>↓</button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {history.length > 0 && (
        <>
          <div className="stat-tiles">
            <div className="stat-tile">
              <span className="stat-num">{summary.total}</span>
              <span className="stat-label">session{summary.total === 1 ? '' : 's'}</span>
            </div>
            <div className="stat-tile">
              <span className="stat-num">{summary.thisWeek}</span>
              <span className="stat-label">this week</span>
            </div>
            <div className="stat-tile">
              <span className="stat-num">{summary.streak}</span>
              <span className="stat-label">week streak</span>
            </div>
            <div className="stat-tile">
              <span className="stat-num">{prs.length}</span>
              <span className="stat-label">PR{prs.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="card weekly-activity">
            <div className="weekly-activity-head">
              <span className="group-label">Weekly activity</span>
              <span className="muted small">
                {summary.volume > 0 ? `${summary.volume.toLocaleString()} ${units} volume this week` : 'last 8 weeks'}
              </span>
            </div>
            {(() => {
              const max = Math.max(1, ...summary.weekly.map((w) => w.count))
              return (
                <div className="week-bars">
                  {summary.weekly.map((w, i) => {
                    const isThis = i === summary.weekly.length - 1
                    const pct = w.count ? Math.max(Math.round((w.count / max) * 100), 14) : 0
                    const label = isThis ? 'now' : (i === 0 ? shortDate(w.weekStart) : '')
                    return (
                      <div
                        className="week-col"
                        key={w.weekStart}
                        title={`${w.count} workout${w.count === 1 ? '' : 's'}`}
                        role="img"
                        aria-label={`Week of ${shortDate(w.weekStart)}${isThis ? ' (this week)' : ''}: ${w.count} workout${w.count === 1 ? '' : 's'}`}
                      >
                        <span className={'week-bar' + (isThis ? ' is-current' : '') + (w.count ? '' : ' is-empty')} aria-hidden="true">
                          <span className="week-bar-fill" style={{ height: `${pct}%` }} />
                        </span>
                        <span className="week-label" aria-hidden="true">{label}</span>
                      </div>
                    )
                  })}
                </div>
              )
            })()}
          </div>
        </>
      )}

      {(history.length > 0 || cardio.length > 0) && (
        <div className="card chart-range-card">
          <div className="weekly-activity-head">
            <span className="group-label">Chart range</span>
            <span className="muted small">Applies to the charts below</span>
          </div>
          <div className="filter-chips" role="group" aria-label="Chart time range">
            {RANGE_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                className={'chip' + (chartRange === o.id ? ' is-selected' : '')}
                aria-pressed={chartRange === o.id}
                onClick={() => setChartRange(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {prs.length > 0 && (
        <div className="progress-section" style={orderStyle('prs')}>
        <CollapsibleCard
          title="Personal records"
          subtitle={`${prs.length} total`}
          open={cardOpen('prs')}
          onToggle={() => toggleCard('prs')}
        >
          <ul className="pr-timeline">
            {prs.slice(0, 30).map((pr, i) => (
              <li className="pr-row" key={`${pr.date}-${pr.exId || pr.name}-${i}`}>
                <span className="pr-row-name">{pr.name}</span>
                <span className="pr-row-detail">{prShort(pr, units)}</span>
                <span className="muted small pr-row-date">{shortDate(pr.date)}</span>
              </li>
            ))}
          </ul>
          {prs.length > 30 && <p className="muted small">Showing your 30 most recent records.</p>}
        </CollapsibleCard>
        </div>
      )}

      <div className="progress-section" style={orderStyle('weight')}>
      <CollapsibleCard
        title={`${weightMetric === 'e1rm' ? 'Estimated 1RM' : 'Top set'} over time (${units})`}
        open={cardOpen('weight')}
        onToggle={() => toggleCard('weight')}
      >
        <div className="seg metric-seg">
          {[{ id: 'top', label: 'Top set' }, { id: 'e1rm', label: 'Est. 1RM' }].map((m) => (
            <button key={m.id} type="button" className={'seg-item' + (weightMetric === m.id ? ' is-selected' : '')} aria-pressed={weightMetric === m.id} onClick={() => setWeightMetric(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        <ProgressChart series={inRange(visible)} units={units} ariaLabel={`${weightMetric === 'e1rm' ? 'Estimated 1RM' : 'Top set'} over time (${units})`} />
        {allSeries.length > 0 && inRange(visible).length === 0 && (
          <p className="muted small">Nothing in this range yet — try a wider one.</p>
        )}
        {allSeries.length > 0 && (
          <div className="legend">
            {(legendAll ? allSeries : allSeries.slice(0, 8)).map((s) => (
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
            {allSeries.length > 8 && (
              <button type="button" className="link-sm" aria-expanded={legendAll} onClick={() => setLegendAll((v) => !v)}>
                {legendAll ? 'Show fewer' : `+${allSeries.length - 8} more`}
              </button>
            )}
          </div>
        )}
        {allSeries.length === 0 && (
          <p className="muted small">Weighted lifts will plot here once you log some.</p>
        )}
      </CollapsibleCard>
      </div>

      {/* ---- Bodyweight over time ---- */}
      {bodyweightLog.length > 1 && (
        <div className="progress-section" style={orderStyle('bodyweight')}>
        <CollapsibleCard
          title={`Bodyweight over time (${units})`}
          subtitle={`${bodyweightLog[0].weight} ${units} now`}
          open={cardOpen('bodyweight')}
          onToggle={() => toggleCard('bodyweight')}
        >
          {inRange(bodyweightSeries).length > 0 ? (
            <ProgressChart series={inRange(bodyweightSeries)} units={units} ariaLabel={`Bodyweight over time (${units})`} />
          ) : (
            <p className="muted small">No weigh-ins in this range yet — try a wider one.</p>
          )}
          <p className="muted small">
            From your weigh-ins in Settings. Also used to score weighted pull-ups and dips as
            bodyweight + added load.
          </p>
        </CollapsibleCard>
        </div>
      )}

      {/* ---- Bodyweight reps ---- */}
      {bwSeries.length > 0 && (
        <div className="progress-section" style={orderStyle('bw')}>
        <CollapsibleCard title="Bodyweight reps over time" open={cardOpen('bw')} onToggle={() => toggleCard('bw')}>
          {inRange(bwVisible).length > 0 ? (
            <ProgressChart series={inRange(bwVisible)} ariaLabel="Bodyweight reps over time" />
          ) : (
            <p className="muted small">Nothing in this range yet — try a wider one.</p>
          )}
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
        </div>
      )}

      {/* ---- Per-exercise history ---- */}
      {exercisesTracked.length > 0 && (
        <div className="progress-section" style={orderStyle('exlist')}>
        <CollapsibleCard
          title="Exercise history"
          subtitle={`${exercisesTracked.length} tracked`}
          open={cardOpen('exlist')}
          onToggle={() => toggleCard('exlist')}
        >
          <p className="muted small">Tap a lift to see its own trend, best marks, and recent sessions.</p>
          {exercisesTracked.length > EX_PAGE && (
            <>
              <input className="text-input ex-history-search" type="search"
                aria-label="Search tracked exercises" placeholder="Search exercises…"
                value={exQuery} onChange={(e) => setExQuery(e.target.value)} />
              {exMuscleOptions.length > 1 && (
                <div className="filter-chips" role="group" aria-label="Filter exercises by muscle">
                  <button type="button" className={'chip' + (exMuscle === 'all' ? ' is-selected' : '')}
                    aria-pressed={exMuscle === 'all'} onClick={() => setExMuscle('all')}>All</button>
                  {exMuscleOptions.map((m) => (
                    <button key={m} type="button" className={'chip cap' + (exMuscle === m ? ' is-selected' : '')}
                      aria-pressed={exMuscle === m} onClick={() => setExMuscle(m)}>{muscleLabel(m)}</button>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="exercise-history-list">
            {exVisible.map((ex) => (
              <button key={ex.id} type="button" className="ex-history-row" onClick={() => setDetailEx(ex)}>
                <span className="ex-history-name">{ex.name}</span>
                <span className="muted small ex-history-date">{shortDate(ex.lastDate)}</span>
                <span className="ex-history-chevron" aria-hidden="true">›</span>
              </button>
            ))}
          </div>
          {exVisible.length === 0 && <p className="muted small">No exercises match.</p>}
          {!exActive && exFiltered.length > exShown && (
            <button type="button" className="btn btn-ghost btn-sm show-more" onClick={() => setExShown((n) => n + EX_PAGE)}>Show all {exFiltered.length}</button>
          )}
          {!exActive && exShown >= exFiltered.length && exFiltered.length > EX_PAGE && (
            <button type="button" className="btn btn-ghost btn-sm show-more" onClick={() => setExShown(EX_PAGE)}>Show fewer</button>
          )}
        </CollapsibleCard>
        </div>
      )}

      {/* ---- Cardio ---- */}
      <div className="progress-section" style={orderStyle('cardio')}>
      <CollapsibleCard
        title="Cardio over time"
        subtitle={cardio.length ? `${cardio.length} logged` : null}
        open={cardOpen('cardio')}
        onToggle={() => toggleCard('cardio')}
      >
        <button className="link-sm" onClick={() => navigate('/cardio')}>＋ Log cardio</button>
        <div className="seg metric-seg">
          {CARDIO_METRICS.map((m) => (
            <button key={m.id} type="button" className={'seg-item' + (cardioMetric === m.id ? ' is-selected' : '')} aria-pressed={cardioMetric === m.id} onClick={() => setCardioMetric(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
        {(() => {
          const cardioRanged = inRange(cardioSeries)
          if (cardioSeries.length === 0) {
            return <p className="muted small">No cardio with this stat yet. <button className="link-btn" onClick={() => navigate('/cardio')}>Log some</button>.</p>
          }
          if (cardioRanged.length === 0) {
            return <p className="muted small">Nothing in this range yet — try a wider one.</p>
          }
          return (
            <>
              <ProgressChart series={cardioRanged} ariaLabel="Cardio over time" />
              <div className="legend">
                {cardioRanged.map((s) => (
                  <span key={s.id} className="legend-item static">
                    <span className="legend-swatch" style={{ background: s.color }} />{s.name}
                  </span>
                ))}
              </div>
            </>
          )
        })()}
        {cardio.length > 0 && (
          <div className="cardio-loglist">
            {cardio.slice(0, 8).map((c) => {
              // U5: cardio can be distance/calorie-only now, so durationMin may
              // be 0 — only show it when it's meaningful, and never leave a
              // dangling separator when it's the only metric present.
              const parts = [
                c.durationMin > 0 ? `${c.durationMin}m` : null,
                c.distance ? `${c.distance}${c.distanceUnit}` : null,
                c.calories ? `${c.calories} cal` : null,
                c.avgHr ? `${c.avgHr}bpm` : null,
              ].filter(Boolean)
              return (
                <div className="log-row" key={c.id}>
                  <span><Icon name="cardio" size={13} /> {c.machineName}</span>
                  <span className="muted small">
                    {parts.length > 0 ? `${parts.join(' · ')} · ` : ''}{new Date(c.date).toLocaleDateString()}
                  </span>
                  <button type="button" className="icon-btn log-del" onClick={() => removeCardio(c)} aria-label="Delete this cardio entry">✕</button>
                </div>
              )
            })}
          </div>
        )}
      </CollapsibleCard>
      </div>

      {history.length > 0 && (
        <div className="progress-section" style={orderStyle('log')}>
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
        </div>
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
