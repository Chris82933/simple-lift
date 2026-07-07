import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises.js'
import {
  estimate1RM, roundTo, workingWeights, goalWorkingSets, METHODS, incrementForUnits,
  interpolate1RM, STRENGTH_RATIOS,
} from '../lib/oneRepMax.js'
import {
  loadSettings, saveSettings, loadMaxes, saveMax, deleteMax,
} from '../lib/storage.js'

// Every loadable lift can get a 1RM — main barbell/dumbbell compounds first,
// then everything else you might have in a program.
const LOADABLE = EXERCISES.filter((e) => e.load !== false && !e.ladderOnly)
const MAIN_LIFTS = LOADABLE.filter(
  (e) => e.compound && (e.requires.includes('barbell') || e.requires.includes('dumbbells')),
)
const OTHER_LIFTS = LOADABLE.filter((e) => !MAIN_LIFTS.includes(e))
const LIFT_OPTIONS = [...MAIN_LIFTS, ...OTHER_LIFTS]

const Stepper = ({ label, value, set, min = 1, max = 20, suffix }) => (
  <div className="stepper">
    <span className="stepper-label">{label}</span>
    <div className="stepper-controls">
      <button type="button" onClick={() => set((v) => Math.max(min, v - 1))} aria-label={`decrease ${label}`}>–</button>
      <span className="stepper-value">{value}{suffix}</span>
      <button type="button" onClick={() => set((v) => Math.min(max, v + 1))} aria-label={`increase ${label}`}>+</button>
    </div>
  </div>
)

export default function OneRepMax() {
  const navigate = useNavigate()
  const [settings, setSettings] = useState(loadSettings())
  const units = settings.units || 'lbs'

  const [liftId, setLiftId] = useState(LIFT_OPTIONS[0]?.id || 'other')
  const [customName, setCustomName] = useState('')
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState(5)
  const [rir, setRir] = useState(0)
  const [inc, setInc] = useState(incrementForUnits(units))
  const [method, setMethod] = useState('average')
  const [advanced, setAdvanced] = useState(false)
  const [, force] = useState(0)
  const refresh = () => force((n) => n + 1)

  const setUnits = (u) => {
    const next = { ...settings, units: u }
    setSettings(next); saveSettings(next); setInc(incrementForUnits(u))
  }

  const effReps = reps + rir
  const oneRMraw = estimate1RM(weight, effReps, method)
  const oneRM = roundTo(oneRMraw, inc)
  const hasResult = oneRM > 0
  const working = hasResult ? workingWeights(oneRMraw, inc) : []
  const goals = hasResult ? goalWorkingSets(oneRMraw, inc) : []

  const liftName = liftId === 'other' ? (customName.trim() || 'Custom lift') : EXERCISE_BY_ID[liftId]?.name
  const saveKey = liftId === 'other'
    ? 'custom_' + customName.trim().toLowerCase().replace(/\s+/g, '_')
    : liftId

  const canSave = hasResult && (liftId !== 'other' || customName.trim())

  const save = () => {
    if (!canSave) return
    saveMax(saveKey, { oneRM, weight: Number(weight), reps, rir, units, name: liftName })
    refresh()
  }

  const maxes = loadMaxes()
  const savedEntries = Object.entries(maxes)

  // Estimate the main barbell lifts you haven't tested yet, from the maxes you
  // have saved — so a new program can still start with sensible weights.
  const estimates = Object.keys(STRENGTH_RATIOS)
    .filter((id) => !maxes[id])
    .map((id) => ({ id, name: EXERCISE_BY_ID[id]?.name || id, raw: interpolate1RM(id, maxes) }))
    .filter((e) => e.raw)
    .map((e) => ({ ...e, oneRM: roundTo(e.raw, inc) }))

  return (
    <section className="page full-flow">
      <header className="page-header">
        <p className="eyebrow">Strength tool</p>
        <h1>1RM &amp; working-weight finder</h1>
        <p className="muted">
          Estimate your one-rep max from a normal set — then get the exact weights to
          train with. Saved results auto-fill your program starting weights.
        </p>
      </header>

      <div className="step-body">
        {/* ---- Inputs ---- */}
        <div className="card">
          <p className="group-label">Lift</p>
          <select className="text-input select" value={liftId} onChange={(e) => setLiftId(e.target.value)}>
            <optgroup label="Main lifts">
              {MAIN_LIFTS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </optgroup>
            <optgroup label="Other lifts">
              {OTHER_LIFTS.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </optgroup>
            <option value="other">Other / custom…</option>
          </select>
          {liftId === 'other' && (
            <input className="text-input" placeholder="Name this lift" value={customName} onChange={(e) => setCustomName(e.target.value)} />
          )}

          <p className="group-label">Units</p>
          <div className="seg">
            {['lbs', 'kg'].map((u) => (
              <button key={u} type="button" className={'seg-item' + (units === u ? ' is-selected' : '')} onClick={() => setUnits(u)}>{u}</button>
            ))}
          </div>

          <p className="group-label">Weight lifted ({units})</p>
          <input
            className="text-input big-input"
            type="number"
            inputMode="decimal"
            placeholder={`e.g. 185`}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />

          <Stepper label="Reps performed" value={reps} set={setReps} min={1} max={20} />
          <Stepper label="Reps left in the tank (RIR)" value={rir} set={setRir} min={0} max={5} />

          <button type="button" className="link-btn" onClick={() => setAdvanced((a) => !a)}>
            {advanced ? '▾ Hide' : '▸ Show'} fine-tuning
          </button>
          {advanced && (
            <div className="advanced">
              <p className="group-label">Estimation formula</p>
              <select className="text-input select" value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              <p className="group-label">Round weights to</p>
              <select className="text-input select" value={inc} onChange={(e) => setInc(Number(e.target.value))}>
                <option value={1}>1 {units}</option>
                <option value={2.5}>2.5 {units}</option>
                <option value={5}>5 {units}</option>
              </select>
            </div>
          )}
        </div>

        {/* ---- Results (screenshot-friendly) ---- */}
        {hasResult ? (
          <div className="card result-card">
            <p className="result-lift">{liftName}</p>
            <p className="result-1rm"><span>{oneRM}</span> {units}</p>
            <p className="muted small">Estimated 1-rep max — from {weight} {units} × {reps} reps{rir ? ` (+${rir} RIR)` : ''}</p>

            <p className="group-label">Working weights by reps</p>
            <div className="weight-table">
              {working.map((row) => (
                <div className="weight-row" key={row.pct}>
                  <span className="muted">{row.pct}%</span>
                  <span>{row.reps} {row.reps === 1 ? 'rep' : 'reps'}</span>
                  <strong>{row.weight} {units}</strong>
                </div>
              ))}
            </div>

            <p className="group-label">By training goal</p>
            <div className="weight-table">
              {goals.map((g) => (
                <div className="weight-row" key={g.goal}>
                  <span>{g.goal}</span>
                  <span className="muted">{g.reps}</span>
                  <strong>{g.weight} {units}</strong>
                </div>
              ))}
            </div>

            <p className="screenshot-hint">📸 Screenshot this to keep your numbers handy.</p>
            <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave}>
              Save {liftName} 1RM
            </button>
          </div>
        ) : (
          <div className="card"><p className="muted">Enter a weight and reps to see your estimated max and working weights.</p></div>
        )}

        {/* ---- Saved maxes ---- */}
        {savedEntries.length > 0 && (
          <div className="card">
            <p className="group-label">Saved maxes</p>
            {savedEntries.map(([key, m]) => (
              <div className="history-row" key={key}>
                <span>{m.name}</span>
                <span className="muted small">{m.oneRM} {m.units} · {new Date(m.updatedAt).toLocaleDateString()}</span>
                <button type="button" className="icon-btn" onClick={() => { deleteMax(key); refresh() }} aria-label={`delete ${m.name}`}>✕</button>
              </div>
            ))}
            <p className="muted small">These auto-fill starting weights when you build a custom program or load a template.</p>
            <button type="button" className="btn btn-primary" onClick={() => navigate('/builder')}>Build a program with these →</button>
          </div>
        )}

        {/* ---- Interpolated estimates for untested lifts ---- */}
        {estimates.length > 0 && (
          <div className="card">
            <p className="group-label">Estimated from your records</p>
            <p className="muted small">
              Rough estimates for main lifts you haven&apos;t tested, based on typical strength ratios to the maxes you&apos;ve saved. Save one to seed a new program, then refine it once you actually test the lift.
            </p>
            {estimates.map((e) => (
              <div className="history-row" key={e.id}>
                <span>{e.name}</span>
                <span className="muted small">≈ {e.oneRM} {units}</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => { saveMax(e.id, { oneRM: e.oneRM, units, name: e.name, estimated: true }); refresh() }}
                >
                  Save
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ---- Instructions & tips ---- */}
        <div className="card notice">
          <p className="placeholder-title">How to use this</p>
          <ul className="tips">
            <li>Do one hard set of a lift (ideally <strong>3–8 reps</strong>) with good form, then enter the weight and reps.</li>
            <li><strong>You don&apos;t need to attempt a true 1-rep max.</strong> Estimating from a submaximal set is safer and just as useful.</li>
            <li>Estimates are most accurate at <strong>5 reps or fewer</strong> — the more reps, the rougher the number.</li>
            <li><strong>RIR</strong> = reps left in the tank. If you stopped with 2 more in you, set RIR to 2 for a better estimate.</li>
            <li>Always <strong>warm up</strong> first, and re-test every few weeks to keep your numbers current.</li>
          </ul>
        </div>
      </div>

      <div className="flow-actions">
        <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>Back</button>
      </div>
    </section>
  )
}
