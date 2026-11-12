import { useMemo, useRef, useState } from 'react'
import useModalA11y from '../lib/useModalA11y.js'
import { instantiateTemplate } from '../data/templates.js'
import { addProgram, loadMaxes, loadSettings, saveMax } from '../lib/storage.js'
import { seedProgramWeights, liftsToAsk, oneRMFor } from '../lib/seedWeights.js'
import { estimate1RM, weightForReps, incrementForUnits } from '../lib/oneRepMax.js'
import { WEEKDAY_SHORT, WEEKDAY_ORDER } from '../lib/schedule.js'
import { acceptNumber, maxWeight } from '../lib/limits.js'

const DEFAULT_DAYS = { 1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5], 6: [1, 2, 3, 4, 5, 6], 7: [0, 1, 2, 3, 4, 5, 6] }

// The one step between "Use this program" and the first workout: which days,
// and (optionally) a weight for the main lifts. Anything left blank starts
// light — the program never opens with an empty weight box, and 5/3/1 always
// gets a training max. Replaces dropping people on the bare Schedule page.
export default function ProgramSetupSheet({ templateId, onCancel, onStarted }) {
  const dialogRef = useRef(null)
  useModalA11y(dialogRef, onCancel)
  const units = loadSettings().units === 'kg' ? 'kg' : 'lbs'
  const inc = incrementForUnits(units)
  const base = useMemo(() => instantiateTemplate(templateId), [templateId])
  const maxes = useMemo(() => loadMaxes(), [])
  const lifts = useMemo(() => (base ? liftsToAsk(base).slice(0, 6) : []), [base])

  const startDays = base?.schedule?.trainingDays?.length
    ? base.schedule.trainingDays
    : DEFAULT_DAYS[Math.min(7, base?.days?.length || 3)]
  const [days, setDays] = useState(startDays)
  const [values, setValues] = useState({})

  if (!base) return null
  const toggleDay = (wd) => setDays((d) => (d.includes(wd) ? d.filter((x) => x !== wd) : [...d, wd]))

  // What a blank box will start at — said in the placeholder, so "blank" never
  // means "nothing".
  const fromSaved = (id) => {
    const rm = oneRMFor(id, maxes)
    return rm ? weightForReps(rm, 5, inc) : null
  }

  const start = () => {
    if (!days.length) return
    for (const l of lifts) {
      const w = Number(values[l.id])
      if (!(w > 0)) continue
      const oneRM = Math.round(estimate1RM(w, 5))
      if (oneRM > 0) saveMax(l.id, { oneRM, weight: w, reps: 5, rir: 0, units, name: l.name })
    }
    const program = seedProgramWeights(
      { ...base, schedule: { ...(base.schedule || {}), mode: 'rotation', trainingDays: [...days].sort((a, b) => a - b), pointer: 0 } },
      { maxes: loadMaxes(), units },
    )
    const made = addProgram(program) // becomes the active program
    onStarted?.(made)
  }

  return (
    <div className="picker-overlay" role="dialog" aria-modal="true" aria-label={`Start ${base.name}`} ref={dialogRef} tabIndex={-1}>
      <div className="picker-sheet setup-sheet">
        <div className="picker-head">
          <p className="ex-name big" style={{ flex: 1 }}>Start {base.name}</p>
        </div>
        <div className="picker-list setup-sheet-body">
          <div>
            <p className="group-label">Which days will you train?</p>
            <div className="check-grid weekday-chips" role="group" aria-label="Training days">
              {WEEKDAY_ORDER.map((wd) => (
                <button
                  key={wd}
                  type="button"
                  className={'check-pill' + (days.includes(wd) ? ' is-selected' : '')}
                  aria-pressed={days.includes(wd)}
                  onClick={() => toggleDay(wd)}
                >
                  {WEEKDAY_SHORT[wd]}
                </button>
              ))}
            </div>
            <p className="muted small">
              {base.days.length} workout{base.days.length === 1 ? '' : 's'} ({base.days.map((d) => d.title).join(', ')}) take turns on the days you pick. Miss one and it simply waits for your next day.
            </p>
          </div>

          {lifts.length > 0 && (
            <div className="setup-weights">
              <p className="group-label">Starting weights <span className="muted">(optional, {units})</span></p>
              <p className="muted small">
                A weight you could lift about 5 times. Not sure? Leave it blank — we&apos;ll start light and you can change any weight during the workout.
              </p>
              {lifts.map((l) => {
                const saved = fromSaved(l.id)
                return (
                  <div className="strength-row" key={l.id}>
                    <label className="strength-label" htmlFor={`setup-${l.id}`}>
                      {l.name}
                      {l.needsTm && <span className="muted small"> · sets your training max</span>}
                    </label>
                    <input
                      id={`setup-${l.id}`}
                      type="number"
                      inputMode="decimal"
                      className="text-input"
                      min="0"
                      placeholder={saved ? `${saved} (from your saved max)` : 'blank = start light'}
                      value={values[l.id] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [l.id]: acceptNumber(e.target.value, v[l.id] ?? '', { max: maxWeight() }) }))}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <div className="picker-foot confirm-foot">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button type="button" className="btn btn-primary" onClick={start} disabled={!days.length}>Start program</button>
        </div>
        {!days.length && <p className="muted small" role="status" style={{ textAlign: 'center' }}>Pick at least one day.</p>}
      </div>
    </div>
  )
}
