import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadActiveProgram, updateProgram } from '../lib/storage.js'
import {
  WEEKDAY_LABELS, WEEKDAY_SHORT, WEEKDAY_ORDER, trainingWeekdays, restWarnings,
} from '../lib/schedule.js'

const toggle = (arr, v) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])

export default function Schedule() {
  const navigate = useNavigate()
  const program = loadActiveProgram()

  const [draft, setDraft] = useState(() => {
    if (!program) return null
    const existingWds = trainingWeekdays(program)
    return {
      mode: program.schedule?.mode || 'fixed',
      trainingDays: program.schedule?.trainingDays?.length
        ? program.schedule.trainingDays
        : (existingWds.length ? existingWds : [1, 3, 5]),
      dayWeekdays: program.days.map((d, i) => (d.weekday != null ? d.weekday : WEEKDAY_ORDER[i % 7])),
    }
  })

  if (!program || !draft) {
    return (
      <section className="page full-flow">
        <header className="page-header"><h1>Schedule</h1></header>
        <div className="card"><p className="muted">No active program to schedule.</p></div>
        <div className="flow-actions">
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
        </div>
      </section>
    )
  }

  const set = (patch) => setDraft((d) => ({ ...d, ...patch }))

  const previewDays =
    draft.mode === 'rotation' ? draft.trainingDays : draft.dayWeekdays
  const warning = restWarnings([...new Set(previewDays)])

  const canSave = draft.mode === 'fixed' || draft.trainingDays.length > 0

  const save = () => {
    let next
    if (draft.mode === 'fixed') {
      next = {
        ...program,
        schedule: { mode: 'fixed' },
        days: program.days.map((d, i) => ({
          ...d,
          weekday: draft.dayWeekdays[i],
          dayLabel: WEEKDAY_LABELS[draft.dayWeekdays[i]],
        })),
      }
    } else {
      next = {
        ...program,
        schedule: {
          mode: 'rotation',
          trainingDays: [...draft.trainingDays].sort((a, b) => a - b),
          pointer: program.schedule?.pointer || 0,
        },
      }
    }
    updateProgram(next)
    navigate('/program')
  }

  return (
    <section className="page full-flow">
      <header className="page-header">
        <p className="eyebrow">{program.name}</p>
        <h1>Workout schedule</h1>
      </header>

      <div className="step-body">
        <div className="card">
          <p className="group-label">How do you want to schedule it?</p>
          <div className="choice-list">
            <button
              type="button"
              className={'choice-row' + (draft.mode === 'fixed' ? ' is-selected' : '')}
              onClick={() => set({ mode: 'fixed' })}
            >
              <span className="choice-title">Same workout each weekday</span>
              <span className="muted small">Pin each workout to a day of the week (e.g. Push every Monday).</span>
            </button>
            <button
              type="button"
              className={'choice-row' + (draft.mode === 'rotation' ? ' is-selected' : '')}
              onClick={() => set({ mode: 'rotation' })}
            >
              <span className="choice-title">Rotate through workouts</span>
              <span className="muted small">Do the next workout in order on each training day — best for GZCLP and 4-on-3-days programs.</span>
            </button>
          </div>
        </div>

        {draft.mode === 'fixed' ? (
          <div className="card">
            <p className="group-label">Assign each workout to a day</p>
            {program.days.map((d, i) => (
              <div className="assign-row" key={i}>
                <span className="ex-name">{d.title}</span>
                <select
                  className="text-input select"
                  value={draft.dayWeekdays[i]}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    set({ dayWeekdays: draft.dayWeekdays.map((w, j) => (j === i ? v : w)) })
                  }}
                >
                  {WEEKDAY_ORDER.map((wd) => (
                    <option key={wd} value={wd}>{WEEKDAY_LABELS[wd]}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        ) : (
          <div className="card">
            <p className="group-label">Which days do you train?</p>
            <div className="check-grid">
              {WEEKDAY_ORDER.map((wd) => (
                <button
                  key={wd}
                  type="button"
                  className={'check-pill' + (draft.trainingDays.includes(wd) ? ' is-selected' : '')}
                  onClick={() => set({ trainingDays: toggle(draft.trainingDays, wd) })}
                >
                  {WEEKDAY_SHORT[wd]}
                </button>
              ))}
            </div>
            <p className="muted small">
              Workouts cycle in order: {program.days.map((d) => d.title).join(' → ')} → (repeat).
            </p>
          </div>
        )}

        {warning && (
          <div className="card notice">
            <p className="muted small rest-note">💤 {warning}</p>
          </div>
        )}
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Cancel</button>
        <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave}>Save schedule</button>
      </div>
    </section>
  )
}
