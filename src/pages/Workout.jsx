import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadActiveProgram, loadSettings, appendWorkout, updateProgram, advanceRotation } from '../lib/storage.js'
import { repsLabel } from '../data/schemes.js'
import { EXERCISE_BY_ID } from '../data/exercises.js'
import { suggestProgress } from '../lib/progression.js'
import { schemeOf, stageNote, evaluateProgression, applyStage } from '../lib/gzclp.js'
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
  const settings = loadSettings()
  const units = settings.units || 'lbs'

  // Snapshot the program & session once at mount so mid-session edits (e.g.
  // leveling up an exercise for next time) don't reload/break the live workout.
  const stateDayIndex = location.state?.dayIndex
  const [snapshot] = useState(() => {
    const program = loadActiveProgram()
    const dayIndex = program ? defaultDayIndex(program, stateDayIndex) : 0
    const raw = program?.days[dayIndex] ?? null
    // Apply the current GZCLP stage so sets/reps shown match the progression.
    const session = raw
      ? { ...raw, exercises: raw.exercises.map((e) => (e.progression ? applyStage(e) : e)) }
      : null
    return { program, dayIndex, session }
  })
  const { program, dayIndex, session } = snapshot
  const goals = program?.goals || program?.meta?.goals || []

  const prescriptionOf = (ex) => ({ sets: ex.sets, repLow: ex.repLow ?? ex.repHigh, repHigh: ex.repHigh })

  // Per-exercise progression suggestions (computed once from history + goals).
  const suggestions = useMemo(() => {
    if (!session) return {}
    const out = {}
    for (const ex of session.exercises) {
      out[ex.id] = suggestProgress(ex, prescriptionOf(ex), units, goals)
    }
    return out
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, units])

  // Set-tracking state: { [exId]: [{ weight, reps, done }] }
  const [sets, setSets] = useState(() => {
    const initial = {}
    if (session) {
      for (const ex of session.exercises) {
        // GZCLP exercises prefill from their tracked working weight.
        if (ex.progression) {
          const weight = ex.progression.weight != null ? String(ex.progression.weight) : ''
          initial[ex.id] = Array.from({ length: ex.sets }, () => ({ weight, reps: String(ex.repHigh), done: false }))
          continue
        }
        const sug = suggestProgress(ex, prescriptionOf(ex), units, goals)
        // Prefill weight from the suggestion, falling back to a custom start weight.
        const weight =
          ex.load !== false
            ? sug?.suggestedWeight
              ? String(sug.suggestedWeight)
              : (ex.startWeight ? String(ex.startWeight) : '')
            : ''
        const reps = String(sug?.suggestedReps ?? ex.repHigh)
        initial[ex.id] = Array.from({ length: ex.sets }, () => ({ weight, reps, done: false }))
      }
    }
    return initial
  })

  const [rest, setRest] = useState(null) // { seconds } | null
  const [finished, setFinished] = useState(false)
  const [progressNotes, setProgressNotes] = useState([]) // scheme progression messages
  const [leveledUp, setLeveledUp] = useState({}) // exId -> new level name (for next session)

  // Swap a bodyweight exercise up to the next ladder level for next time.
  const levelUp = (ex, nextId) => {
    const next = EXERCISE_BY_ID[nextId]
    if (!next) return
    const prog = loadActiveProgram()
    const newEx = {
      id: next.id, name: next.name, pattern: next.pattern, regions: next.regions,
      compound: next.compound, load: next.load !== false, cues: next.cues,
      ladderId: next.ladderId || null, nextId: next.nextId || null, prevId: next.prevId || null,
      sets: ex.sets, repLow: ex.repLow ?? ex.repHigh, repHigh: ex.repHigh, restSec: ex.restSec, startWeight: '',
    }
    updateProgram({
      ...prog,
      days: prog.days.map((d, i) =>
        i === dayIndex ? { ...d, exercises: d.exercises.map((e) => (e.id === ex.id ? newEx : e)) } : d,
      ),
    })
    setLeveledUp((s) => ({ ...s, [ex.id]: next.name }))
  }

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
      programId: program.id,
      sessionTitle: session.title,
      dayIndex,
      entries,
    })

    // Apply scheme-based progression (e.g. GZCLP stages/weights) for next time.
    const notes = []
    const fresh = loadActiveProgram()
    if (fresh) {
      let changed = false
      const updatedExercises = fresh.days[dayIndex].exercises.map((ex) => {
        if (!ex.progression) return ex
        const result = evaluateProgression(ex, sets[ex.id] || [], units)
        if (!result) return ex
        changed = true
        notes.push(result.message)
        return applyStage({ ...ex, progression: result.progression })
      })
      if (changed) {
        updateProgram({
          ...fresh,
          days: fresh.days.map((d, i) => (i === dayIndex ? { ...d, exercises: updatedExercises } : d)),
        })
      }
    }
    setProgressNotes(notes)

    // For rotation programs, advance to the next workout in the cycle.
    advanceRotation(program.id, dayIndex)
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
          <p className="muted">{doneSets} of {totalSets} sets logged. Your progress is saved.</p>
        </div>
        {progressNotes.length > 0 && (
          <div className="card">
            <p className="group-label">Next session</p>
            {progressNotes.map((n, i) => (
              <p className="muted small progress-note" key={i}>📈 {n}</p>
            ))}
          </div>
        )}
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
                    {ex.sets} sets × {repsLabel(ex)}{ex.amrap ? '+' : ''} reps · {ex.restSec}s rest
                    {ex.compound ? ' · compound' : ''}
                  </p>
                </div>
              </div>

              <p className="cue">💡 {ex.cues}</p>
              {ex.progression ? (
                <p className="suggestion">🎯 {stageNote(ex, units)}</p>
              ) : leveledUp[ex.id] ? (
                <p className="suggestion">✓ Leveled up — next session you&apos;ll do {leveledUp[ex.id]}.</p>
              ) : sug?.kind === 'levelUp' ? (
                <div className="suggestion levelup">
                  <span>🚀 {sug.reason}</span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => levelUp(ex, sug.nextId)}>
                    Level up
                  </button>
                </div>
              ) : (
                sug?.reason && <p className="suggestion">📈 {sug.reason}</p>
              )}

              <div className={'set-table' + (tracksLoad ? '' : ' no-load')}>
                <div className="set-head">
                  <span>Set</span>
                  {tracksLoad && <span>{units}</span>}
                  <span>reps</span>
                  <span>done</span>
                </div>
                {sets[ex.id].map((row, idx) => {
                  const isAmrapSet = ex.amrap && idx === sets[ex.id].length - 1
                  return (
                  <div className={'set-line' + (row.done ? ' done' : '')} key={idx}>
                    <span className="set-num" title={isAmrapSet ? 'AMRAP — as many reps as possible' : undefined}>
                      {idx + 1}{isAmrapSet ? '+' : ''}
                    </span>
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
                  )
                })}
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
