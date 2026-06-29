import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { loadActiveProgram, loadSettings, appendWorkout, updateProgram, advanceRotation, addCardio } from '../lib/storage.js'
import { repsLabel, schemeForGoals, prescriptionFor } from '../data/schemes.js'
import { stageNote, applyStage } from '../lib/gzclp.js'
import { reviewSession, applyChoices, INCREMENTS } from '../lib/sessionReview.js'
import ExerciseFigure from '../components/ExerciseFigure.jsx'
import FormCheckButton from '../components/FormCheckButton.jsx'
import RestTimer from '../components/RestTimer.jsx'
import ExercisePicker from '../components/ExercisePicker.jsx'
import CardioForm from '../components/CardioForm.jsx'

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

// ---- progression-choice options (end-of-session). Default is always 'keep'. ----
const optionsFor = (sug, units) => {
  if (sug.type === 'levelUp') {
    return [
      { key: 'levelUp', label: `Level up → ${sug.nextName}` },
      { key: 'keep', label: 'Keep same' },
    ]
  }
  const opts = []
  if (sug.type === 'load') {
    for (const inc of INCREMENTS[units] || INCREMENTS.lbs) {
      opts.push({ key: `w${inc}`, label: `+${inc} ${units}`, recommended: inc === sug.recommendedInc })
    }
  }
  if (sug.reps) opts.push({ key: 'reps', label: '+1 rep' })
  opts.push({ key: 'keep', label: 'Keep same' })
  return opts
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

  // Live, editable exercise list (lets users add/remove/adjust mid-workout).
  const [exercises, setExercises] = useState(() => (session ? session.exercises : []))
  const [editMode, setEditMode] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [cardioOpen, setCardioOpen] = useState(false)
  const [cardioSaved, setCardioSaved] = useState(0)

  const [rest, setRest] = useState(null)
  const [finished, setFinished] = useState(false)
  const [review, setReview] = useState({ autoNotes: [], suggestions: [] })
  const [choices, setChoices] = useState({})

  // Add an exercise to this session (one-off — not saved to the program).
  const addExercise = (ex) => {
    if (exercises.some((e) => e.id === ex.id)) return // avoid dup ids/state collision
    const scheme = schemeForGoals(goals)
    const p = prescriptionFor(ex, scheme)
    const entry = {
      id: ex.id, name: ex.name, pattern: ex.pattern, regions: ex.regions,
      compound: ex.compound, load: ex.load !== false, cues: ex.cues,
      ladderId: ex.ladderId || null, nextId: ex.nextId || null,
      sets: p.sets, repLow: p.repLow, repHigh: p.repHigh, restSec: p.restSec, startWeight: '', adhoc: true,
    }
    setExercises((list) => [...list, entry])
    setSets((s) => ({
      ...s,
      [ex.id]: Array.from({ length: p.sets }, () => ({ weight: '', reps: String(p.repHigh), done: false })),
    }))
  }

  const removeExercise = (exId) => {
    setExercises((list) => list.filter((e) => e.id !== exId))
    setSets((s) => { const n = { ...s }; delete n[exId]; return n })
  }

  const adjustRest = (exId, delta) =>
    setExercises((list) => list.map((e) => (e.id === exId ? { ...e, restSec: Math.max(0, e.restSec + delta) } : e)))

  const logCardio = (entry) => { addCardio(entry); setCardioSaved((n) => n + 1); setCardioOpen(false) }

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

  const totalSets = exercises.reduce((n, ex) => n + (sets[ex.id]?.length || ex.sets), 0)
  const doneSets = Object.values(sets).flat().filter((r) => r.done).length

  const finish = () => {
    const entries = exercises.map((ex) => ({ exerciseId: ex.id, name: ex.name, sets: sets[ex.id] }))
    appendWorkout({ date: new Date().toISOString(), programId: program.id, sessionTitle: session.title, dayIndex, entries })

    // Carry values forward + auto-apply deloads; collect optional increase suggestions.
    // Ad-hoc adds aren't in the program, so they can't persist/progress — exclude them.
    const programIds = new Set(program.days[dayIndex].exercises.map((e) => e.id))
    const result = reviewSession({ ...session, exercises }, sets, goals, units)
    result.persist = result.persist.filter((p) => programIds.has(p.exId))
    result.suggestions = result.suggestions.filter((s) => programIds.has(s.exId))
    const fresh = loadActiveProgram()
    if (fresh) updateProgram(applyPersist(fresh, dayIndex, result.persist))
    advanceRotation(program.id, dayIndex)

    // Default is always "keep the same" — increases are an explicit choice.
    const initChoices = {}
    result.suggestions.forEach((s) => { initChoices[s.exId] = 'keep' })
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
            <p className="group-label">Progress next time?</p>
            <p className="muted small">
              You completed everything on these. Bump them up only if it felt right — otherwise keep the same (the default).
            </p>
            {review.suggestions.map((sug) => (
              <div className="review-row" key={sug.exId}>
                <span className="review-name">{sug.type === 'levelUp' ? '🚀' : '✅'} {sug.name}</span>
                <div className="choice-chips">
                  {optionsFor(sug, units).map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      className={'chip' + (choices[sug.exId] === opt.key ? ' is-selected' : '')}
                      onClick={() => setChoices((c) => ({ ...c, [sug.exId]: opt.key }))}
                    >
                      {opt.label}{opt.recommended ? ' ★' : ''}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="muted small">★ = the usual jump for this kind of lift.</p>
          </div>
        )}

        {review.suggestions.length > 0 && (
          <details className="card guide">
            <summary>When should I add weight or reps?</summary>
            <ul className="tips">
              <li><strong>Add weight</strong> when you finished all sets and reps with clean form and the last set still had <strong>1–2 reps in the tank</strong> — the bar moved smoothly, not a grind.</li>
              <li><strong>Add a rep</strong> when you hit your sets but the weight felt heavy, or your goal is muscle/endurance — earn the reps before adding load.</li>
              <li><strong>Keep the same</strong> if form broke down, bar speed slowed a lot, or any set felt maximal. Repeating a weight builds confidence and is never wasted.</li>
              <li><strong>Increment guide:</strong> big lifts (squat, deadlift) jump ~10 lb, upper-body presses/rows ~5 lb, and small isolation moves ~2.5 lb.</li>
            </ul>
          </details>
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
        <div className="workout-head-row">
          <p className="eyebrow">{session.dayLabel} · Workout</p>
          <button type="button" className={'edit-toggle' + (editMode ? ' is-on' : '')} onClick={() => setEditMode((e) => !e)}>
            {editMode ? 'Done editing' : '✎ Edit'}
          </button>
        </div>
        <h1>{session.title}</h1>
        <div className="progress-track" aria-hidden="true">
          <div className="progress-fill" style={{ width: `${(doneSets / Math.max(1, totalSets)) * 100}%` }} />
        </div>
        <p className="muted small">{doneSets} / {totalSets} sets done</p>
      </header>

      <div className="step-body">
        {exercises.map((ex) => {
          const tracksLoad = ex.load !== false
          return (
            <div className="card exercise-card" key={ex.id}>
              <div className="exercise-top">
                <ExerciseFigure pattern={ex.pattern} size={52} />
                <div className="exercise-headings">
                  <div className="ex-title-row">
                    <p className="ex-name big">{ex.name}{ex.adhoc ? ' ＋' : ''}</p>
                    {editMode
                      ? <button type="button" className="icon-btn" onClick={() => removeExercise(ex.id)} aria-label={`Remove ${ex.name}`}>✕</button>
                      : <FormCheckButton name={ex.name} />}
                  </div>
                  <p className="muted small">
                    {ex.sets} sets × {repsLabel(ex)}{ex.amrap ? '+' : ''} reps · {ex.restSec}s rest
                    {ex.compound ? ' · compound' : ''}
                  </p>
                </div>
              </div>

              {editMode && (
                <div className="rest-edit">
                  <span className="muted small">Rest timer</span>
                  <div className="rest-stepper">
                    <button type="button" onClick={() => adjustRest(ex.id, -15)} aria-label="less rest">–</button>
                    <span>{ex.restSec}s</span>
                    <button type="button" onClick={() => adjustRest(ex.id, 15)} aria-label="more rest">+</button>
                  </div>
                </div>
              )}

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

        <div className="add-row">
          <button type="button" className="btn btn-ghost" onClick={() => setPickerOpen(true)}>＋ Add exercise</button>
          <button type="button" className="btn btn-ghost" onClick={() => setCardioOpen(true)}>❤️ Log cardio</button>
        </div>
        {cardioSaved > 0 && <p className="muted small">✓ {cardioSaved} cardio session{cardioSaved === 1 ? '' : 's'} logged.</p>}
      </div>

      <div className="flow-actions">
        <button className="btn btn-ghost" onClick={() => navigate('/today')}>Exit</button>
        <button className="btn btn-primary" onClick={finish}>Finish workout</button>
      </div>

      {rest && <RestTimer key={rest.key} seconds={rest.seconds} onDone={() => setRest(null)} />}

      {pickerOpen && (
        <ExercisePicker onPick={addExercise} onClose={() => setPickerOpen(false)} />
      )}
      {cardioOpen && (
        <div className="picker-overlay" role="dialog" aria-label="Log cardio">
          <div className="picker-sheet">
            <div className="picker-head">
              <p className="ex-name big" style={{ flex: 1 }}>Log cardio</p>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCardioOpen(false)}>Close</button>
            </div>
            <div className="picker-list">
              <CardioForm onSaved={logCardio} units={units} />
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
