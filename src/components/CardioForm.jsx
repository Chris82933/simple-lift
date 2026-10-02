import { useState } from 'react'
import { CARDIO_MACHINES, CARDIO_BY_ID } from '../data/cardio.js'
import Icon from './Icon.jsx'
import { acceptNumber } from '../lib/limits.js'

// Fields for logging a cardio session. Calls onSaved(entry) with the data.
// `initialMachine` preselects a machine (e.g. when logging a planned program block).
export default function CardioForm({ onSaved, units = 'lbs', initialMachine = 'treadmill' }) {
  const [machine, setMachine] = useState(initialMachine)
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [distUnit, setDistUnit] = useState(units === 'kg' ? 'km' : 'mi')
  const [avgHr, setAvgHr] = useState('')
  const [calories, setCalories] = useState('')
  const [notes, setNotes] = useState('')
  // Yesterday's run, logged today. Local calendar date, not UTC — toISOString
  // would roll an evening entry into tomorrow.
  const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` }
  const [day, setDay] = useState(todayStr)

  const hasDistance = CARDIO_BY_ID[machine]?.distance
  // Any ONE meaningful metric is enough to save — someone logging "3 miles"
  // with no watch on shouldn't be blocked just because duration is blank (U5).
  const canSave = Number(duration) > 0 || (hasDistance && Number(distance) > 0) || Number(calories) > 0

  const save = () => {
    if (!canSave) return
    onSaved({
      // Today keeps the real time; an earlier day is stamped at midday so it
      // sorts sensibly within that day.
      date: (!day || day === todayStr() ? new Date() : new Date(`${day}T12:00:00`)).toISOString(),
      machine,
      machineName: CARDIO_BY_ID[machine]?.name || 'Cardio',
      durationMin: Number(duration) || 0,
      distance: hasDistance && Number(distance) ? Number(distance) : null,
      distanceUnit: distUnit,
      avgHr: Number(avgHr) || null,
      calories: Number(calories) || null,
      notes: notes.trim(),
    })
    setDuration(''); setDistance(''); setAvgHr(''); setCalories(''); setNotes('')
  }

  return (
    <div className="cardio-form">
      <p className="group-label">Machine / activity</p>
      <div className="machine-grid">
        {CARDIO_MACHINES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={'machine-chip' + (machine === m.id ? ' is-selected' : '')}
            aria-pressed={machine === m.id}
            style={machine === m.id ? { borderColor: m.color, background: `color-mix(in srgb, ${m.color} 20%, var(--surface))` } : undefined}
            onClick={() => setMachine(m.id)}
          >
            <span className="machine-icon"><Icon name="cardio" size={16} /></span>{m.name}
          </button>
        ))}
      </div>

      <div className="cardio-fields">
        <label>Date
          <input type="date" value={day} max={todayStr()} onChange={(e) => setDay(e.target.value)} />
        </label>
        <label>Time (min)
          <input type="number" inputMode="numeric" value={duration} placeholder="30" min="0" onChange={(e) => setDuration(acceptNumber(e.target.value, duration, { max: 1440 }))} />
        </label>
        {hasDistance && (
          <label>Distance
            <div className="dist-row">
              <input type="number" inputMode="decimal" value={distance} placeholder="3.0" min="0" onChange={(e) => setDistance(acceptNumber(e.target.value, distance, { max: 1000 }))} />
              <button type="button" className="unit-toggle" onClick={() => setDistUnit((u) => (u === 'mi' ? 'km' : 'mi'))}>{distUnit}</button>
            </div>
          </label>
        )}
        <label>Avg HR (bpm)
          <input type="number" inputMode="numeric" value={avgHr} placeholder="140" min="0" onChange={(e) => setAvgHr(acceptNumber(e.target.value, avgHr, { max: 250 }))} />
        </label>
        <label>Calories
          <input type="number" inputMode="numeric" value={calories} placeholder="320" min="0" onChange={(e) => setCalories(acceptNumber(e.target.value, calories, { max: 20000 }))} />
        </label>
      </div>

      <input className="text-input" aria-label="Cardio notes" placeholder="Notes (level, incline, how it felt…)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      <button type="button" className="btn btn-primary" onClick={save} disabled={!canSave}>Save cardio</button>
    </div>
  )
}
