import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadActiveProgram, loadSettings, appendWorkout, updateProgram, advanceRotation } from '../lib/storage.js'
import { repsLabel } from '../data/schemes.js'
import { stageNote, applyStage } from '../lib/gzclp.js'
import { reviewSession, applyChoices } from '../lib/sessionReview.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'
import RestTimer from '../components/RestTimer.jsx'

function defaultDayIndex(program, stateIndex) {
  if (Number.isInteger(stateIndex)) return stateIndex
  const today = new Date().getDay()
  const idx = program.days.findIndex((d) => d.weekday === today)
  return idx === -1 ? 0 : idx
}

// Write the carried-forward values (entered weights, auto GZCLP deloads) to the program.
function applyPersist(program, dayIndex, persist) {
  const exercises = program.days[dayIndex].exercises.map((ex) => {
    const p = persist.find((x) => x.exId === ex.id)
    if (!p) return ex
    let next = { ...ex }
    if (p.startWeight != null) next.startWeight = p.startWeight
    if (p.progression) next = applyStage({ ...next, progression: p.progression })
    return next
  })
  return { ...program, days: program.days.map((d, i) => (i === dayIndex ? { ...d, exercises } : d)) }
}

// ---- progression-choice helpers (end-of-session) ----
const optionsFor = (sug) => {
  if (sug.kind === 'levelUp') return ['levelUp', 'keep']
  const opts = []
  if (sug.weight) opts.push('weight')
  if (sug.reps && sug.kind !== 'gzclp') opts.push('reps')
  opts.push('keep')
  return opts
}
const defaultChoice = (sug) => {
  const opts = optionsFor(sug)
  if (sug.kind === 'levelUp') return 'levelUp'
  if (sug.goalDefault === 'reps' && opts.includes('reps')) return 'reps'
  if (opts.includes('weight')) return 'weight'
  if (opts.includes('reps')) return 'reps'
  return 'keep'
}
const labelFor = (opt, sug, units) => {
  if (opt === 'weight') return `+${sug.weight.inc} ${units}`
  if (opt === 'reps') return '+1 rep'
  if (opt === 'levelUp') return `Level up → ${sug.nextName}`
  return 'Keep same'
}

export default function Workout() {
  const navigate = useNavigate()
  const location = useLocation()
  const settings = loadSettings()
  const units = settings.units || 'lbs'

  // Snapshot the program & session once at mount so mid-session edits don't reload the live workout.
  const stateDayIndex = location.state?.dayIndex
  const [snapshot] = useState(() => {
    const program = loadActiveProgram()
    const dayIndex = program ? defaultDayIndex(program, stateDayIndex) : 0
    const raw = program?.days[dayIndex] ?? null
    const session = raw
      ? { ...raw, exercises: raw.exercises.map((e) => (e.progression ? applyStage(e) : e)) }
      : null
    return { program, dayIndex, session }
  })
  const { program, dayIndex, session } = snapshot
  const goals = program?.goals || program?.meta?.goals || []

  // Set-tracking state: prefilled from each exercise's stored working values
  // (so values carry over session-to-session, even when sets weren't ticked).
  const [sets, setSets] = useState(() => {
    const initial = {}
    if (session) {
      for (const ex of session.exercises) {
        const stored = ex.progression?.weight != null ? ex.progression.weight : ex.startWeight
        const weight = ex.load !== false && stored !== '' && stored != null ? String(stored) : ''
        initial[ex.id] = Array.from({ length: ex.sets }, () => ({ weight, reps: String(ex.repHigh), done: false }))
      }
    }
    return initial
  })

  const [rest, setRest] = useState(null)
  const [finished, setFinished] = useState(false)
  const [review, setReview] = useState({ autoNotes: [], suggestions: [] })
  const [choices, setChoices] = useState({})

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
      return { ...s, [exId]: s[exId].map((r, i) => (i === idx ? { ...r, done: nowDone } : r)) }
    })

  const totalSets = session.exercises.reduce((n, ex) => n + ex.sets, 0)
  const doneSets = Object.values(sets).flat().filter((r) => r.done).length

  const finish = () => {
    const entries = session.exercises.map((ex) => ({ exerciseId: ex.id, name: ex.name, sets: sets[ex.id] }))
    appendWorkout({ date: new Date().toISOString(), programId: program.id, sessionTitle: session.title, dayIndex, entries })

    // Carry values forward + auto-apply deloads; collect optional increase suggestions.
    const result = reviewSession(session, sets, goals, units)
    const fresh = loadActiveProgram()
    if (fresh) updateProgram(applyPersist(fresh, dayIndex, result.persist))
    advanceRotation(program.id, dayIndex)

    const initChoices = {}
    result.suggestions.forEach((s) => { initChoices[s.exId] = defaultChoice(s) })
    setChoices(initChoices)
    setReview(result)
    setFinished(true)
  }

  // Apply the user's confirmed progression choices, then leave.
  const done = () => {
    if (review.suggestions.length) {
      const fresh = loadActiveProgram()
      if (fresh) updateProgram(applyChoices(fresh, dayIndex, review.suggestions, choices))
    }
    navigate('/today')
  }

  if (finished) {
    const goalWord = review.goalDefault === 'reps' ? 'more reps' : 'more weight'
    return (
      <section className="page full-flow">
        <header className="page-header">
          <p className="eyebrow">Nice work 🎉</p>
          <h1>Session complete</h1>
        </header>

        <div className="card">
          <p className="placeholder-title">{session.title}</p>
          <p className="muted">{doneSets} of {totalSets} sets logged. Your weights are saved for next time.</p>
        </div>

        {review.suggestions.length > 0 && (
          <div className="card">
            <p className="group-label">Ready for more next time?</p>
            <p className="muted small">
              You completed everything on these. Based on your goals we&apos;ve pre-picked <strong>{goalWord}</strong> — tweak any below, or keep them the same.
            </p>
            {review.suggestions.map((sug) => (
              <div className="review-row" key={sug.exId}>
                <span className="review-name">{sug.kind === 'levelUp' ? '🚀' : '✅'} {sug.name}</span>
                <div className="choice-chips">
                  {optionsFor(sug).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className={'chip' + (choices[sug.exId] === opt ? ' is-selected' : '')}
                      onClick={() => setChoices((c) => ({ ...c, [sug.exId]: opt }))}
                    >
                      {labelFor(opt, sug, units)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {review.autoNotes.length > 0 && (
          <div className="card notice">
            <p className="group-label">Adjusted automatically</p>
            {review.autoNotes.map((n, i) => <p className="muted small progress-note" key={i}>🔧 {n}</p>)}
          </div>
        )}

        <div className="flow-actions">
          <button className="btn btn-primary" onClick={done}>
            {review.suggestions.length ? 'Save & finish' : 'Done'}
          </button>
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
          const tracksLoad = ex.load !== false
          return (
            <div className="card exercise-card" key={ex.id}>
              <div className="exercise-top">
                <ExerciseFigure pattern={ex.pattern} size={52} />
                <div className="exercise-headings">
                  <div className="ex-title-row">
                    <p className="ex-name big">{ex.name}</p>
                    <FormCheckButton name={ex.name} />
                  </div>
                  <p className="muted small">
                    {ex.sets} sets × {repsLabel(ex)}{ex.amrap ? '+' : ''} reps · {ex.restSec}s rest
                    {ex.compound ? ' · compound' : ''}
                  </p>
                </div>
              </div>

              <p className="cue">💡 {ex.cues}</p>
              {ex.progression && <p className="suggestion">🎯 {stageNote(ex, units)}</p>}

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

      {rest && <RestTimer key={rest.key} seconds={rest.seconds} onDone={() => setRest(null)} />}
    </section>
  )
}
