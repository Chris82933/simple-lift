import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadProgram, loadSettings, appendWorkout } from '../lib/storage.js'
import { repsLabel } from '../data/schemes.js'
import { suggestLoad } from '../lib/progression.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'
import RestTimer from '../components/RestTimer.jsx'

function defaultDayIndex(program, stateIndex) {
  if (Number.isInteger(stateIndex)) return stateIndex
  const today = new Date().getDay()
  const idx = program.days.findIndex((d) => d.weekday === today)
  return idx === -1 ? 0 : idx
}

export default function Workout() {
  const navigate = useNavigate()
  const location = useLocation()
  const program = loadProgram()
  const settings = loadSettings()
  const units = settings.units || 'lbs'

  const dayIndex = program ? defaultDayIndex(program, location.state?.dayIndex) : 0
  const session = program?.days[dayIndex]

  // Per-exercise progression suggestions (computed once from history).
  const suggestions = useMemo(() => {
    if (!session) return {}
    const out = {}
    for (const ex of session.exercises) {
      out[ex.id] = suggestLoad(ex, { sets: ex.sets, repHigh: ex.repHigh }, units)
    }
    return out
  }, [session, units])

  // Set-tracking state: { [exId]: [{ weight, reps, done }] }
  const [sets, setSets] = useState(() => {
    const initial = {}
    if (session) {
      for (const ex of session.exercises) {
        const sug = suggestLoad(ex, { sets: ex.sets, repHigh: ex.repHigh }, units)
        initial[ex.id] = Array.from({ length: ex.sets }, () => ({
          weight: ex.load !== false && sug?.suggestedWeight ? String(sug.suggestedWeight) : '',
          reps: String(ex.repHigh),
          done: false,
        }))
      }
    }
    return initial
  })

  const [rest, setRest] = useState(null) // { seconds } | null
  const [finished, setFinished] = useState(false)

  if (!program || !session) {
    return (
      <section className="page full-flow">
        <header className="page-header"><h1>No workout</h1></header>
        <div className="card"><p className="muted">No program found. Build one first.</p></div>
        <div className="flow-actions">
          <button className="btn btn-ghost" onClick={() => navigate('/today')}>Back</button>
        </div>
      </section>
    )
  }

  const updateSet = (exId, idx, field, value) =>
    setSets((s) => ({
      ...s,
      [exId]: s[exId].map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    }))

  const toggleDone = (exId, idx, restSec) =>
    setSets((s) => {
      const row = s[exId][idx]
      const nowDone = !row.done
      if (nowDone) setRest({ seconds: restSec, key: `${exId}-${idx}-${Date.now()}` })
      return {
        ...s,
        [exId]: s[exId].map((r, i) => (i === idx ? { ...r, done: nowDone } : r)),
      }
    })

  const totalSets = session.exercises.reduce((n, ex) => n + ex.sets, 0)
  const doneSets = Object.values(sets).flat().filter((r) => r.done).length

  const finish = () => {
    const entries = session.exercises.map((ex) => ({
      exerciseId: ex.id,
      name: ex.name,
      sets: sets[ex.id],
    }))
    appendWorkout({
      date: new Date().toISOString(),
      sessionTitle: session.title,
      dayIndex,
      entries,
    })
    setFinished(true)
  }

  if (finished) {
    return (
      <section className="page full-flow">
        <header className="page-header">
          <p className="eyebrow">Nice work 🎉</p>
          <h1>Session complete</h1>
        </header>
        <div className="card">
          <p className="placeholder-title">{session.title}</p>
          <p className="muted">
            {doneSets} of {totalSets} sets logged. Your progress is saved — next time
            we&apos;ll use it to suggest your weights.
          </p>
        </div>
        <div className="flow-actions">
          <button className="btn btn-primary" onClick={() => navigate('/today')}>Done</button>
        </div>
      </section>
    )
  }

  return (
    <section className="page full-flow workout">
      <header className="page-header">
        <p className="eyebrow">{session.dayLabel} · Workout</p>
        <h1>{session.title}</h1>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${(doneSets / totalSets) * 100}%` }} />
        </div>
        <p className="muted small">{doneSets} / {totalSets} sets done</p>
      </header>

      <div className="step-body">
        {session.exercises.map((ex) => {
          const sug = suggestions[ex.id]
          const tracksLoad = ex.load !== false
          return (
            <div className="card exercise-card" key={ex.id}>
              <div className="exercise-top">
                <ExerciseFigure pattern={ex.pattern} size={52} />
                <div>
                  <p className="ex-name big">{ex.name}</p>
                  <p className="muted small">
                    {ex.sets} sets × {repsLabel(ex)} reps · {ex.restSec}s rest
                    {ex.compound ? ' · compound' : ''}
                  </p>
                </div>
              </div>

              <p className="cue">💡 {ex.cues}</p>
              {sug?.reason && <p className="suggestion">📈 {sug.reason}</p>}

              <div className={'set-table' + (tracksLoad ? '' : ' no-load')}>
                <div className="set-head">
                  <span>Set</span>
                  {tracksLoad && <span>{units}</span>}
                  <span>reps</span>
                  <span>done</span>
                </div>
                {sets[ex.id].map((row, idx) => (
                  <div className={'set-line' + (row.done ? ' done' : '')} key={idx}>
                    <span className="set-num">{idx + 1}</span>
                    {tracksLoad && (
                      <input
                        className="set-input"
                        type="number"
                        inputMode="decimal"
                        value={row.weight}
                        placeholder="–"
                        onChange={(e) => updateSet(ex.id, idx, 'weight', e.target.value)}
                      />
                    )}
                    <input
                      className="set-input"
                      type="number"
                      inputMode="numeric"
                      value={row.reps}
                      placeholder="–"
                      onChange={(e) => updateSet(ex.id, idx, 'reps', e.target.value)}
                    />
                    <button
                      type="button"
                      className={'set-check' + (row.done ? ' is-on' : '')}
                      aria-label={row.done ? 'Mark set incomplete' : 'Mark set complete'}
                      aria-pressed={row.done}
                      onClick={() => toggleDone(ex.id, idx, ex.restSec)}
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flow-actions">
        <button className="btn btn-ghost" onClick={() => navigate('/today')}>Exit</button>
        <button className="btn btn-primary" onClick={finish}>Finish workout</button>
      </div>

      {rest && (
        <RestTimer key={rest.key} seconds={rest.seconds} onDone={() => setRest(null)} />
      )}
    </section>
  )
}
