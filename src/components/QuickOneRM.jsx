import { useState } from 'react'
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises.js'
import { estimate1RM, roundTo, weightForReps, incrementForUnits } from '../lib/oneRepMax.js'
import { saveMax } from '../lib/storage.js'

// Compact 1RM estimator for use mid-workout (in a modal). Does NOT touch the
// live session — it only reads inputs and can optionally save the estimate so
// it auto-fills future programs. Great for figuring out a starting weight on a
// lift you've never done before.
const LIFT_OPTIONS = EXERCISES.filter(
  (e) => e.compound && e.load !== false && !e.ladderOnly &&
    (e.requires.includes('barbell') || e.requires.includes('dumbbells')),
)

export default function QuickOneRM({ units = 'lbs', onClose }) {
  const inc = incrementForUnits(units)
  const [liftId, setLiftId] = useState(LIFT_OPTIONS[0]?.id || 'other')
  const [customName, setCustomName] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('5')
  const [saved, setSaved] = useState(false)

  const repsNum = Number(reps)
  const oneRMraw = estimate1RM(weight, repsNum, 'average')
  const oneRM = roundTo(oneRMraw, inc)
  const hasResult = oneRM > 0

  const liftName = liftId === 'other' ? (customName.trim() || 'Custom lift') : EXERCISE_BY_ID[liftId]?.name
  const saveKey = liftId === 'other'
    ? 'custom_' + customName.trim().toLowerCase().replace(/\s+/g, '_')
    : liftId
  const canSave = hasResult && (liftId !== 'other' || customName.trim())

  const save = () => {
    if (!canSave) return
    saveMax(saveKey, { oneRM, weight: Number(weight), reps: repsNum, rir: 0, units, name: liftName })
    setSaved(true)
  }

  // A handful of suggested working weights to actually train with right now.
  const suggestions = hasResult
    ? [5, 8, 10].map((r) => ({ reps: r, weight: weightForReps(oneRMraw, r, inc) }))
    : []

  return (
    <div className="picker-overlay" role="dialog" aria-label="Quick 1RM">
      <div className="picker-sheet quick-1rm">
        <div className="picker-head">
          <p className="ex-name big" style={{ flex: 1 }}>Quick 1RM</p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="picker-list">
          <p className="muted small">
            Estimate a max without leaving your workout — handy for a lift you&apos;ve never
            done. Saving it auto-fills future programs.
          </p>

          <p className="group-label">Lift</p>
          <select className="text-input select" value={liftId} onChange={(e) => { setLiftId(e.target.value); setSaved(false) }}>
            {LIFT_OPTIONS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="other">Other / custom…</option>
          </select>
          {liftId === 'other' && (
            <input className="text-input" placeholder="Name this lift" value={customName} onChange={(e) => { setCustomName(e.target.value); setSaved(false) }} />
          )}

          <div className="quick-1rm-row">
            <label>
              <span className="group-label">Weight ({units})</span>
              <input className="text-input" type="number" inputMode="decimal" placeholder="e.g. 95" value={weight} onChange={(e) => { setWeight(e.target.value); setSaved(false) }} />
            </label>
            <label>
              <span className="group-label">Reps</span>
              <input className="text-input" type="number" inputMode="numeric" placeholder="5" value={reps} onChange={(e) => { setReps(e.target.value); setSaved(false) }} />
            </label>
          </div>

          {hasResult ? (
            <div className="card result-card" style={{ marginTop: 4 }}>
              <p className="result-lift">{liftName}</p>
              <p className="result-1rm"><span>{oneRM}</span> {units}</p>
              <p className="muted small">Estimated 1-rep max from {weight} {units} × {repsNum} reps</p>
              <div className="weight-table">
                {suggestions.map((s) => (
                  <div className="weight-row" key={s.reps}>
                    <span className="muted">{s.reps} reps</span>
                    <strong>{s.weight} {units}</strong>
                  </div>
                ))}
              </div>
              <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave || saved}>
                {saved ? '✓ Saved' : `Save ${liftName} 1RM`}
              </button>
            </div>
          ) : (
            <p className="muted small">Enter a weight and reps to estimate.</p>
          )}
        </div>
      </div>
    </div>
  )
}
